import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/client";
import { RSS_SOURCES } from "@/lib/rss-sources";
import { buildSynthesisPrompt } from "@/lib/synthesis-prompt";
import { findAndStoreArticleImage, extractImageKeywords } from "@/lib/article-images";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Simple auth token to prevent unauthorized triggers
const GENERATE_SECRET = process.env.GENERATE_SECRET || "fleet-desk-generate-2026";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
  sourceDomain: string;
}

interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  topic: string;
  imageKeywords?: string[];
  sources: {
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }[];
}

// ─── RSS Parsing ──────────────────────────────────────────────────────────────

function parseRSSItems(xml: string, sourceName: string, sourceDomain: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];

  // Simple XML parsing without a library — extract <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        link: link.trim(),
        description: cleanHtml(description || ""),
        pubDate: pubDate || new Date().toISOString(),
        sourceName,
        sourceDomain,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1];

  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const tagMatch = regex.exec(xml);
  if (tagMatch) return tagMatch[1];

  return null;
}

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

// ─── Fetch all RSS feeds ──────────────────────────────────────────────────────

async function fetchAllFeeds(): Promise<RawFeedItem[]> {
  const allItems: RawFeedItem[] = [];

  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.feedUrl, {
          headers: { "User-Agent": "TheFleetDesk/1.0 (news aggregator)" },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.log(`RSS fetch failed for ${source.name}: ${response.status}`);
          return [];
        }

        const xml = await response.text();
        return parseRSSItems(xml, source.name, source.domain);
      } catch (error) {
        console.log(`RSS fetch error for ${source.name}:`, error);
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  return allItems;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

async function deduplicateItems(items: RawFeedItem[]): Promise<RawFeedItem[]> {
  // Get URLs we've already processed
  const { data: existing } = await supabaseAdmin
    .from("raw_articles")
    .select("url")
    .order("created_at", { ascending: false })
    .limit(500);

  const existingUrls = new Set((existing ?? []).map((e) => e.url));

  // Also check by similar titles in our published articles
  const { data: published } = await supabaseAdmin
    .from("articles")
    .select("title")
    .order("published_at", { ascending: false })
    .limit(100);

  const publishedTitles = new Set(
    (published ?? []).map((p) => p.title.toLowerCase().slice(0, 50))
  );

  return items.filter((item) => {
    if (existingUrls.has(item.link)) return false;
    // Rough title similarity check
    const shortTitle = item.title.toLowerCase().slice(0, 50);
    if (publishedTitles.has(shortTitle)) return false;
    return true;
  });
}

// ─── Store raw articles ───────────────────────────────────────────────────────

async function storeRawArticles(items: RawFeedItem[]): Promise<void> {
  if (items.length === 0) return;

  // Look up or create source records
  for (const item of items) {
    // Check if source exists
    const { data: existingSource } = await supabaseAdmin
      .from("sources")
      .select("id")
      .eq("url", `https://${item.sourceDomain}`)
      .single();

    const sourceId =
      existingSource?.id ||
      (
        await supabaseAdmin
          .from("sources")
          .upsert(
            {
              name: item.sourceName,
              url: `https://${item.sourceDomain}`,
              active: true,
            },
            { onConflict: "url" }
          )
          .select("id")
          .single()
      ).data?.id;

    if (sourceId) {
      await supabaseAdmin.from("raw_articles").upsert(
        {
          source_id: sourceId,
          title: item.title,
          url: item.link,
          summary: item.description.slice(0, 500),
          published_at: item.pubDate,
          topic_tags: [],
        },
        { onConflict: "url" }
      );
    }
  }
}

// ─── Claude Synthesis ─────────────────────────────────────────────────────────

async function synthesizeArticle(
  cluster: RawFeedItem[]
): Promise<GeneratedArticle | null> {
  const sourceSummaries = cluster
    .map(
      (item, i) =>
        `Source ${i + 1} [${item.sourceName} - ${item.sourceDomain}]:\nTitle: ${item.title}\nURL: ${item.link}\nSummary: ${item.description}\nPublished: ${item.pubDate}`
    )
    .join("\n\n");

  const prompt = buildSynthesisPrompt(sourceSummaries);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse Claude response as JSON");
      return null;
    }

    return JSON.parse(jsonMatch[0]) as GeneratedArticle;
  } catch (error) {
    console.error("Claude synthesis error:", error);
    return null;
  }
}

// ─── Publish Article ──────────────────────────────────────────────────────────

async function publishArticle(article: GeneratedArticle): Promise<string | null> {
  // Find and store a unique, relevant image for this article
  const keywords = article.imageKeywords?.length
    ? article.imageKeywords
    : extractImageKeywords(article.title, article.topic);
  const imageUrl = await findAndStoreArticleImage(article.slug, keywords);

  // Insert the article
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
      published_at: new Date().toISOString(),
      featured_image_url: imageUrl,
      source_count: article.sources.length,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert article:", error);
    return null;
  }

  // Insert sources
  if (inserted && article.sources.length > 0) {
    const sourceRows = article.sources.map((s, i) => ({
      article_id: inserted.id,
      title: s.title,
      url: s.url,
      domain: s.domain,
      snippet: s.snippet,
      section_index: i,
    }));

    // Also add The Fleet Desk as a source
    sourceRows.push({
      article_id: inserted.id,
      title: article.title,
      url: `https://thefleetdesk.com/articles/${article.slug}`,
      domain: "thefleetdesk.com",
      snippet: article.excerpt,
      section_index: sourceRows.length,
    });

    await supabaseAdmin.from("article_sources").insert(sourceRows);

    // Update source count to include Fleet Desk
    await supabaseAdmin
      .from("articles")
      .update({ source_count: sourceRows.length })
      .eq("id", inserted.id);
  }

  return inserted?.id ?? null;
}

// ─── Clustering ───────────────────────────────────────────────────────────────

function clusterItems(items: RawFeedItem[]): RawFeedItem[][] {
  // Simple clustering: group items with overlapping keywords in titles
  const used = new Set<number>();
  const clusters: RawFeedItem[][] = [];

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

  // Sort by cluster size (biggest stories first), then take top N
  return clusters.sort((a, b) => b.length - a.length);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const { secret, count } = await request.json().catch(() => ({ secret: "", count: 3 }));
  if (secret !== GENERATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articlesToGenerate = Math.min(count || 3, 5); // Max 5 per run

  try {
    console.log("[Generate] Starting content generation...");

    // 1. Fetch all RSS feeds
    console.log("[Generate] Fetching RSS feeds...");
    const rawItems = await fetchAllFeeds();
    console.log(`[Generate] Fetched ${rawItems.length} raw items from RSS`);

    if (rawItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No RSS items found. Check feed URLs.",
        articlesGenerated: 0,
      });
    }

    // 2. Deduplicate
    const newItems = await deduplicateItems(rawItems);
    console.log(`[Generate] ${newItems.length} new items after dedup`);

    if (newItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All items already processed. No new content to generate.",
        articlesGenerated: 0,
      });
    }

    // 3. Store raw articles
    await storeRawArticles(newItems);

    // 4. Cluster related stories
    const clusters = clusterItems(newItems);
    console.log(`[Generate] ${clusters.length} story clusters identified`);

    // 5. Synthesize articles from top clusters
    const generatedIds: string[] = [];

    for (let i = 0; i < Math.min(articlesToGenerate, clusters.length); i++) {
      const cluster = clusters[i]!;
      console.log(
        `[Generate] Synthesizing article ${i + 1} from ${cluster.length} sources: "${cluster[0]!.title}"`
      );

      const article = await synthesizeArticle(cluster);
      if (!article) {
        console.log(`[Generate] Failed to synthesize article ${i + 1}`);
        continue;
      }

      const articleId = await publishArticle(article);
      if (articleId) {
        generatedIds.push(articleId);
        console.log(
          `[Generate] Published: "${article.title}" (${articleId})`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedIds.length} articles from ${rawItems.length} RSS items`,
      articlesGenerated: generatedIds.length,
      articleIds: generatedIds,
      feedItemsFound: rawItems.length,
      newItemsAfterDedup: newItems.length,
      clustersFound: clusters.length,
    });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: "Content generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
