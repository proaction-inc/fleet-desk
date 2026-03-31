import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  findAndStoreArticleImage,
  resetUsedPhotosCache,
} from "@/lib/article-images";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const GENERATE_SECRET =
  process.env.GENERATE_SECRET || "fleet-desk-generate-2026";

async function getImageKeywordsFromClaude(
  title: string,
  excerpt: string,
  topic: string
): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Generate 3-4 specific image search keywords for this fleet industry article. Be specific. Respond with ONLY a JSON array of strings.

Title: ${title}
Excerpt: ${excerpt}
Topic: ${topic}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (error) {
    console.error("[Migrate] Claude keywords error:", error);
  }
  return [];
}

export async function POST(request: NextRequest) {
  const { secret, forceAll } = await request
    .json()
    .catch(() => ({ secret: "", forceAll: false }));
  if (secret !== GENERATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all published articles with their sources
  const { data: articles, error } = await supabaseAdmin
    .from("articles")
    .select("id, slug, title, excerpt, topic, featured_image_url")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toMigrate = forceAll
    ? articles ?? []
    : (articles ?? []).filter(
        (a) =>
          !a.featured_image_url ||
          !a.featured_image_url.includes("supabase.co/storage")
      );

  console.log(
    `[Migrate] ${toMigrate.length} articles to process (forceAll: ${forceAll})`
  );

  resetUsedPhotosCache();

  const results: { slug: string; status: string; imageSource?: string }[] = [];

  for (const article of toMigrate) {
    try {
      // Get source URLs for this article (for og:image extraction)
      const { data: sources } = await supabaseAdmin
        .from("article_sources")
        .select("url, domain")
        .eq("article_id", article.id)
        .neq("domain", "thefleetdesk.com");

      const sourceUrls = (sources ?? []).map((s) => s.url);

      // Get keywords as fallback
      const keywords = await getImageKeywordsFromClaude(
        article.title,
        article.excerpt,
        article.topic
      );

      console.log(
        `[Migrate] ${article.slug} → ${sourceUrls.length} source URLs, keywords: ${keywords.slice(0, 2).join(", ")}`
      );

      const newUrl = await findAndStoreArticleImage(
        article.slug,
        keywords,
        sourceUrls
      );

      if (newUrl && newUrl.includes("supabase.co/storage")) {
        await supabaseAdmin
          .from("articles")
          .update({ featured_image_url: newUrl })
          .eq("id", article.id);

        results.push({ slug: article.slug, status: "migrated" });
        console.log(`[Migrate] ✓ ${article.slug}`);
      } else {
        results.push({ slug: article.slug, status: "fallback" });
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      results.push({ slug: article.slug, status: "error" });
      console.error(`[Migrate] ✗ ${article.slug}:`, err);
    }
  }

  const migrated = results.filter((r) => r.status === "migrated").length;

  return NextResponse.json({
    success: true,
    total: toMigrate.length,
    migrated,
    results,
  });
}
