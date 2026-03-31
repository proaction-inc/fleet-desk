import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/client";
import { buildSynthesisPrompt } from "@/lib/synthesis-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const GENERATE_SECRET =
  process.env.GENERATE_SECRET || "fleet-desk-generate-2026";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawItem {
  title: string;
  link: string;
  description: string;
  sourceDomain: string;
}

interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  topic: string;
  sources: {
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }[];
}

// ─── Google News fetch for date range ─────────────────────────────────────────

const SEARCH_QUERIES = [
  "fleet management trucking",
  "FMCSA regulation trucking",
  "fleet safety technology telematics",
  "trucking carrier acquisition merger",
  "commercial truck fleet technology",
  "ELD compliance fleet",
  "autonomous trucking freight",
  "fleet maintenance costs",
];

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractTag(xml: string, tag: string): string | null {
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1];

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const tagMatch = regex.exec(xml);
  if (tagMatch) return tagMatch[1];

  return null;
}

async function fetchGoogleNewsForPeriod(
  startDate: string,
  endDate: string
): Promise<RawItem[]> {
  const allItems: RawItem[] = [];

  // Format dates for Google News: YYYY-MM-DD
  const after = startDate;
  const before = endDate;

  for (const query of SEARCH_QUERIES) {
    try {
      const encodedQuery = encodeURIComponent(
        `${query} after:${after} before:${before}`
      );
      const feedUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "TheFleetDesk/1.0 (news aggregator)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.log(
          `[Backfill] Google News fetch failed for "${query}": ${response.status}`
        );
        continue;
      }

      const xml = await response.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;

      while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const title = extractTag(itemXml, "title");
        const link = extractTag(itemXml, "link");
        const description = extractTag(itemXml, "description");
        const source = extractTag(itemXml, "source");

        if (title && link) {
          // Extract domain from link
          let domain = "news.google.com";
          try {
            domain = new URL(link.trim()).hostname.replace(/^www\./, "");
          } catch {
            // keep default
          }

          allItems.push({
            title: cleanHtml(title),
            link: link.trim(),
            description: cleanHtml(description || ""),
            sourceDomain: source ? cleanHtml(source) : domain,
          });
        }
      }

      console.log(
        `[Backfill] "${query}" (${after} to ${before}): ${allItems.length} total items`
      );
    } catch (error) {
      console.log(`[Backfill] Error fetching "${query}":`, error);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  return allItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Clustering ───────────────────────────────────────────────────────────────

function clusterItems(items: RawItem[]): RawItem[][] {
  const used = new Set<number>();
  const clusters: RawItem[][] = [];

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;

    const cluster = [items[i]!];
    used.add(i);

    const words = new Set(
      items[i]!.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;

      const otherWords = items[j]!.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);

      const overlap = otherWords.filter((w) => words.has(w)).length;
      if (overlap >= 2) {
        cluster.push(items[j]!);
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters
    .filter((c) => c.length >= 1)
    .sort((a, b) => b.length - a.length);
}

// ─── Claude Synthesis ─────────────────────────────────────────────────────────

async function synthesizeArticle(
  cluster: RawItem[],
  targetDate: string
): Promise<GeneratedArticle | null> {
  const sourceSummaries = cluster
    .map(
      (item, i) =>
        `Source ${i + 1} [${item.sourceDomain}]:\nTitle: ${item.title}\nURL: ${item.link}\nSummary: ${item.description}`
    )
    .join("\n\n");

  const prompt = buildSynthesisPrompt(sourceSummaries, targetDate);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as GeneratedArticle;
  } catch (error) {
    console.error("[Backfill] Claude error:", error);
    return null;
  }
}

// ─── Image selection ──────────────────────────────────────────────────────────

function getTopicImage(topic: string): string {
  const topicImages: Record<string, string[]> = {
    "Fleet Management & Technology": [
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=675&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&fit=crop",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&fit=crop",
    ],
    "Regulatory & Compliance": [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=675&fit=crop",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=675&fit=crop",
    ],
    "Fleet Safety": [
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=675&fit=crop",
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=675&fit=crop",
    ],
    "Industry Deals": [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=675&fit=crop",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=675&fit=crop",
    ],
  };

  const images =
    topicImages[topic] ?? topicImages["Fleet Management & Technology"]!;
  return images[Math.floor(Math.random() * images.length)]!;
}

// ─── Publish ──────────────────────────────────────────────────────────────────

async function publishArticle(
  article: GeneratedArticle,
  publishDate: string
): Promise<string | null> {
  // Check for slug collision
  const { data: existing } = await supabaseAdmin
    .from("articles")
    .select("id")
    .eq("slug", article.slug)
    .single();

  if (existing) {
    console.log(`[Backfill] Slug already exists: ${article.slug}, skipping`);
    return null;
  }

  const imageUrl = getTopicImage(article.topic);

  const { data: inserted, error } = await supabaseAdmin
    .from("articles")
    .insert({
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      topic: article.topic,
      author: "The Fleet Desk",
      published: true,
      published_at: publishDate,
      featured_image_url: imageUrl,
      source_count: article.sources.length + 1, // +1 for Fleet Desk
      created_at: publishDate,
      updated_at: publishDate,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Backfill] Insert error:", error);
    return null;
  }

  if (inserted) {
    const sourceRows = article.sources.map((s, i) => ({
      article_id: inserted.id,
      title: s.title,
      url: s.url,
      domain: s.domain,
      snippet: s.snippet,
      section_index: i,
    }));

    sourceRows.push({
      article_id: inserted.id,
      title: article.title,
      url: `https://thefleetdesk.com/articles/${article.slug}`,
      domain: "thefleetdesk.com",
      snippet: article.excerpt,
      section_index: sourceRows.length,
    });

    await supabaseAdmin.from("article_sources").insert(sourceRows);
  }

  return inserted?.id ?? null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const {
    secret,
    startDate,
    endDate,
    articlesPerWeek = 3,
  } = await request.json().catch(() => ({
    secret: "",
    startDate: "",
    endDate: "",
    articlesPerWeek: 3,
  }));

  if (secret !== GENERATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      {
        error: "startDate and endDate required (YYYY-MM-DD format)",
        example: {
          secret: "...",
          startDate: "2025-10-01",
          endDate: "2026-03-15",
          articlesPerWeek: 3,
        },
      },
      { status: 400 }
    );
  }

  try {
    console.log(
      `[Backfill] Starting backfill from ${startDate} to ${endDate}, ${articlesPerWeek} articles/week`
    );

    // Break the date range into 2-week windows for Google News queries
    const start = new Date(startDate);
    const end = new Date(endDate);
    const windows: { start: string; end: string; midpoint: string }[] = [];

    const cursor = new Date(start);
    while (cursor < end) {
      const windowEnd = new Date(cursor);
      windowEnd.setDate(windowEnd.getDate() + 14);
      if (windowEnd > end) windowEnd.setTime(end.getTime());

      const midpoint = new Date(
        cursor.getTime() + (windowEnd.getTime() - cursor.getTime()) / 2
      );

      windows.push({
        start: cursor.toISOString().split("T")[0]!,
        end: windowEnd.toISOString().split("T")[0]!,
        midpoint: midpoint.toISOString(),
      });

      cursor.setDate(cursor.getDate() + 14);
    }

    console.log(`[Backfill] ${windows.length} 2-week windows to process`);

    const allGenerated: {
      id: string;
      title: string;
      date: string;
    }[] = [];

    for (const window of windows) {
      console.log(
        `[Backfill] Processing window: ${window.start} to ${window.end}`
      );

      // Fetch Google News for this window
      const items = await fetchGoogleNewsForPeriod(window.start, window.end);
      console.log(`[Backfill] Found ${items.length} items for this window`);

      if (items.length === 0) continue;

      // Cluster
      const clusters = clusterItems(items);
      console.log(`[Backfill] ${clusters.length} clusters`);

      // Generate articles for this window (spread across the 2 weeks)
      const toGenerate = Math.min(
        Math.ceil(articlesPerWeek * 2), // 2 weeks worth
        clusters.length,
        6 // cap per window
      );

      for (let i = 0; i < toGenerate; i++) {
        const cluster = clusters[i]!;

        // Spread publish dates across the window
        const dayOffset = Math.floor((14 / toGenerate) * i);
        const publishDate = new Date(window.start);
        publishDate.setDate(publishDate.getDate() + dayOffset);
        // Add some hour randomness (9am-4pm)
        publishDate.setHours(9 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60));
        const publishDateStr = publishDate.toISOString();

        console.log(
          `[Backfill] Synthesizing "${cluster[0]!.title}" for ${publishDateStr.split("T")[0]}`
        );

        const article = await synthesizeArticle(cluster, window.start);
        if (!article) continue;

        const articleId = await publishArticle(article, publishDateStr);
        if (articleId) {
          allGenerated.push({
            id: articleId,
            title: article.title,
            date: publishDateStr.split("T")[0]!,
          });
          console.log(`[Backfill] Published: "${article.title}" (${publishDateStr.split("T")[0]})`);
        }

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${allGenerated.length} articles generated`,
      articlesGenerated: allGenerated.length,
      articles: allGenerated,
      windowsProcessed: windows.length,
    });
  } catch (error) {
    console.error("[Backfill] Error:", error);
    return NextResponse.json(
      { error: "Backfill failed", details: String(error) },
      { status: 500 }
    );
  }
}
