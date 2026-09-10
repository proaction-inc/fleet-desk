import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { supabaseAdmin } from "@/lib/supabase/client";
import { RSS_SOURCES } from "@/lib/rss-sources";
import { buildSynthesisPrompt } from "@/lib/synthesis-prompt";
import { findAndStoreArticleImage, extractImageKeywords } from "@/lib/article-images";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Simple auth token to prevent unauthorized triggers
const GENERATE_SECRET = process.env.GENERATE_SECRET || "fleet-desk-generate-2026";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_SYNTHESIS_ATTEMPTS = 15;
const MAX_CLUSTER_SCAN_ATTEMPTS = 30;
const MIN_CLUSTER_SCAN_ATTEMPTS = 12;
const CLUSTER_SCAN_ATTEMPTS_PER_ARTICLE = 8;
const GENERATION_TIME_BUDGET_MS = 52_000;
const MIN_SYNTHESIS_TIME_MS = 5_000;
const MIN_PUBLISH_TIME_MS = 8_000;
const POST_IMAGE_INSERT_RESERVE_MS = 5_000;
const SYNTHESIS_CALL_TIMEOUT_MS = 20_000;

export const maxDuration = 60;

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

interface GeneratedArticleToolInput extends Partial<GeneratedArticle> {
  action?: "publish" | "skip";
  skipReason?: string;
}

const ARTICLE_TOOL: Tool = {
  name: "publish_article",
  description:
    "Return one generated Fleet Desk article as structured data, or return a skip result when the source cluster is out of scope.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["publish", "skip"],
        description:
          "Use publish for an in-scope article, or skip when the source cluster should not become a Fleet Desk article.",
      },
      skipReason: {
        type: "string",
        description: "Required when action is skip. Briefly explain why the cluster is out of scope.",
      },
      title: { type: "string" },
      slug: { type: "string" },
      excerpt: { type: "string" },
      content: { type: "string" },
      topic: {
        type: "string",
        enum: [
          "Fleet Management & Technology",
          "Regulatory & Compliance",
          "Fleet Safety",
          "Industry Deals",
          "Industry Events",
          "Electric & Alternative Fuel",
        ],
      },
      imageKeywords: {
        type: "array",
        items: { type: "string" },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            domain: { type: "string" },
            snippet: { type: "string" },
          },
          required: ["title", "url", "domain", "snippet"],
        },
      },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function normalizeArticleSources(input: unknown): GeneratedArticle["sources"] | null {
  if (!Array.isArray(input) || input.length === 0) {
    return null;
  }

  const sources: GeneratedArticle["sources"] = [];
  for (const source of input) {
    if (!source || typeof source !== "object") {
      return null;
    }

    const rawSource = source as Record<string, unknown>;
    if (
      typeof rawSource.title !== "string" ||
      typeof rawSource.url !== "string" ||
      typeof rawSource.domain !== "string" ||
      typeof rawSource.snippet !== "string"
    ) {
      return null;
    }

    const title = rawSource.title.trim();
    const url = rawSource.url.trim();
    const domain = rawSource.domain.trim() || domainFromUrl(url);

    if (!title || !url || !domain) {
      return null;
    }

    sources.push({
      title,
      url,
      domain,
      snippet: rawSource.snippet,
    });
  }

  return sources;
}

function normalizeGeneratedArticle(
  input: unknown
): { article: GeneratedArticle | null; error?: string } {
  if (!input || typeof input !== "object") {
    return { article: null, error: "Model returned non-object article data" };
  }

  const raw = input as GeneratedArticleToolInput;
  const action = raw.action || "publish";

  if (action === "skip") {
    return {
      article: null,
      error: `Model skipped cluster: ${raw.skipReason || "source cluster is out of scope"}`,
    };
  }

  if (action !== "publish") {
    return { article: null, error: `Model returned unsupported action: ${String(raw.action)}` };
  }

  if (!raw.title || !raw.excerpt || !raw.content || !raw.topic) {
    return { article: null, error: "Model article missing required text fields" };
  }

  const title = String(raw.title);
  const sources = normalizeArticleSources(raw.sources);
  if (!sources) {
    return { article: null, error: "Model article missing usable sources" };
  }

  return {
    article: {
      title,
      slug: raw.slug ? slugify(String(raw.slug)) : slugify(title),
      excerpt: String(raw.excerpt),
      content: String(raw.content),
      topic: String(raw.topic),
      imageKeywords: Array.isArray(raw.imageKeywords)
        ? raw.imageKeywords.filter((keyword) => typeof keyword === "string")
        : extractImageKeywords(title, String(raw.topic)),
      sources,
    },
  };
}

function normalizedItemText(item: RawFeedItem): string {
  return `${item.title} ${item.description} ${item.sourceDomain}`.toLowerCase();
}

function isDisallowedCluster(cluster: RawFeedItem[]): string | null {
  for (const item of cluster) {
    const text = normalizedItemText(item);

    if (
      text.includes("enterprise fleet management") &&
      (text.includes("900,000") || text.includes("900000"))
    ) {
      return "near-duplicate Enterprise 900,000-vehicle coverage";
    }

    if (
      text.includes("pennsylvania") &&
      /\brta\b/.test(text) &&
      text.includes("fleet management software")
    ) {
      return "direct fleet-management software vendor profile";
    }

    if (
      text.includes("cassandra gaines") ||
      (text.includes("carrier selection") && text.includes("freightwaves"))
    ) {
      return "freight-carrier selection story outside Fleet Desk fit";
    }

    if (
      text.includes("top logistics fleets") ||
      text.includes("logistics fleets outperform")
    ) {
      return "logistics-carrier benchmark story outside Fleet Desk fit";
    }
  }

  return null;
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
    // Never ingest our own articles as sources
    if (item.link.includes("thefleetdesk.com")) return false;
    if (item.title.toLowerCase().includes("the fleet desk")) return false;
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
  cluster: RawFeedItem[],
  timeoutMs: number
): Promise<{ article: GeneratedArticle | null; error?: string }> {
  const sourceSummaries = cluster
    .map(
      (item, i) =>
        `Source ${i + 1} [${item.sourceName} - ${item.sourceDomain}]:\nTitle: ${item.title}\nURL: ${item.link}\nSummary: ${item.description}\nPublished: ${item.pubDate}`
    )
    .join("\n\n");

  const prompt = buildSynthesisPrompt(sourceSummaries);

  try {
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        tools: [ARTICLE_TOOL],
        tool_choice: { type: "tool", name: ARTICLE_TOOL.name },
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: timeoutMs }
    );

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === ARTICLE_TOOL.name
    );
    if (toolUse?.type === "tool_use") {
      return normalizeGeneratedArticle(toolUse.input);
    }

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse Claude response as JSON");
      return { article: null, error: "Failed to parse model response as JSON" };
    }

    return normalizeGeneratedArticle(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Claude synthesis error:", error);
    return { article: null, error: String(error) };
  }
}

// ─── Publish Article ──────────────────────────────────────────────────────────

function remainingTimeMs(deadlineMs: number): number {
  return deadlineMs - Date.now();
}

function hasTimeForArticleAttempt(deadlineMs: number): boolean {
  return remainingTimeMs(deadlineMs) >= MIN_SYNTHESIS_TIME_MS + MIN_PUBLISH_TIME_MS;
}

async function publishArticle(
  article: GeneratedArticle,
  deadlineMs: number
): Promise<string | null> {
  if (remainingTimeMs(deadlineMs) < MIN_PUBLISH_TIME_MS) {
    console.log(`[Generate] Skipping publish for "${article.title}": request time budget is low`);
    return null;
  }

  // Find and store a unique, relevant image for this article
  // Priority: og:image from sources > Unsplash search > fallback
  const keywords = article.imageKeywords?.length
    ? article.imageKeywords
    : extractImageKeywords(article.title, article.topic);
  const sourceUrls = article.sources.map((s) => s.url);
  const { publicUrl, sourceImageUrl } = await findAndStoreArticleImage(
    article.slug,
    keywords,
    sourceUrls,
    deadlineMs - POST_IMAGE_INSERT_RESERVE_MS
  );

  if (remainingTimeMs(deadlineMs) < POST_IMAGE_INSERT_RESERVE_MS) {
    console.log(`[Generate] Skipping database insert for "${article.title}": request time budget is low`);
    return null;
  }

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
      featured_image_url: publicUrl,
      source_image_url: sourceImageUrl,
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

    await supabaseAdmin.from("article_sources").insert(sourceRows);
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
  const generationDeadline = Date.now() + GENERATION_TIME_BUDGET_MS;

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

    if (!hasTimeForArticleAttempt(generationDeadline)) {
      return NextResponse.json({
        success: true,
        message: "Feed processing consumed the generation time budget.",
        articlesGenerated: 0,
        feedItemsFound: rawItems.length,
        generationErrors: ["Stopped before deduplication because the generation time budget was reached"],
        model: ANTHROPIC_MODEL,
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

    if (!hasTimeForArticleAttempt(generationDeadline)) {
      return NextResponse.json({
        success: true,
        message: "Deduplication consumed the generation time budget.",
        articlesGenerated: 0,
        feedItemsFound: rawItems.length,
        newItemsAfterDedup: newItems.length,
        generationErrors: ["Stopped before storing raw articles because the generation time budget was reached"],
        model: ANTHROPIC_MODEL,
      });
    }

    // 3. Store raw articles
    await storeRawArticles(newItems);

    if (!hasTimeForArticleAttempt(generationDeadline)) {
      return NextResponse.json({
        success: true,
        message: "Raw article storage consumed the generation time budget.",
        articlesGenerated: 0,
        feedItemsFound: rawItems.length,
        newItemsAfterDedup: newItems.length,
        generationErrors: ["Stopped before synthesis because the generation time budget was reached"],
        model: ANTHROPIC_MODEL,
      });
    }

    // 4. Cluster related stories
    const clusters = clusterItems(newItems);
    console.log(`[Generate] ${clusters.length} story clusters identified`);

    // 5. Synthesize articles from top clusters
    const generatedIds: string[] = [];
    const generationErrors: string[] = [];
    let synthesisAttempts = 0;

    const maxClusterAttempts = Math.min(
      clusters.length,
      Math.min(
        Math.max(articlesToGenerate * CLUSTER_SCAN_ATTEMPTS_PER_ARTICLE, MIN_CLUSTER_SCAN_ATTEMPTS),
        MAX_CLUSTER_SCAN_ATTEMPTS
      )
    );

    for (
      let i = 0;
      i < maxClusterAttempts && generatedIds.length < articlesToGenerate;
      i++
    ) {
      const cluster = clusters[i]!;
      const disallowedReason = isDisallowedCluster(cluster);
      if (disallowedReason) {
        generationErrors.push(
          `Article ${i + 1} skipped for "${cluster[0]!.title}": ${disallowedReason}`
        );
        continue;
      }

      const remainingBudgetMs = generationDeadline - Date.now();
      if (remainingBudgetMs < MIN_SYNTHESIS_TIME_MS + MIN_PUBLISH_TIME_MS) {
        generationErrors.push(
          `Stopped after ${i} cluster attempts because the generation time budget was reached`
        );
        break;
      }

      if (synthesisAttempts >= MAX_SYNTHESIS_ATTEMPTS) {
        generationErrors.push(
          `Stopped after ${i} cluster attempts because the synthesis attempt limit was reached`
        );
        break;
      }

      console.log(
        `[Generate] Synthesizing article ${i + 1} from ${cluster.length} sources: "${cluster[0]!.title}"`
      );

      synthesisAttempts++;
      const { article, error: synthesisError } = await synthesizeArticle(
        cluster,
        Math.min(SYNTHESIS_CALL_TIMEOUT_MS, remainingBudgetMs - MIN_PUBLISH_TIME_MS)
      );
      if (!article) {
        console.log(`[Generate] Failed to synthesize article ${i + 1}`);
        generationErrors.push(
          `Article ${i + 1} synthesis failed for "${cluster[0]!.title}": ${
            synthesisError || "unknown error"
          }`
        );
        continue;
      }

      if (remainingTimeMs(generationDeadline) < MIN_PUBLISH_TIME_MS) {
        generationErrors.push(
          `Article ${i + 1} skipped before publish for "${article.title}": generation time budget was reached`
        );
        break;
      }

      const articleId = await publishArticle(article, generationDeadline);
      if (articleId) {
        generatedIds.push(articleId);
        console.log(
          `[Generate] Published: "${article.title}" (${articleId})`
        );
      } else {
        generationErrors.push(
          `Article ${i + 1} publish failed for "${article.title}"`
        );
      }
    }

    if (generatedIds.length > 0) {
      revalidateTag("articles", "seconds");
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedIds.length} articles from ${rawItems.length} RSS items`,
      articlesGenerated: generatedIds.length,
      articleIds: generatedIds,
      feedItemsFound: rawItems.length,
      newItemsAfterDedup: newItems.length,
      clustersFound: clusters.length,
      generationErrors,
      model: ANTHROPIC_MODEL,
    });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: "Content generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
