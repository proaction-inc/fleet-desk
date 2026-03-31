import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/client";
import { findAndStoreArticleImage } from "@/lib/article-images";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const GENERATE_SECRET =
  process.env.GENERATE_SECRET || "fleet-desk-generate-2026";

/**
 * Use Claude to generate unique, specific image search keywords
 * for each article based on its actual content.
 */
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
          content: `Generate 3-4 specific, unique image search keywords for this fleet industry article. The keywords should find a RELEVANT stock photo — be specific, avoid generic terms like "fleet" or "technology" alone. Think about what the photo should actually SHOW.

Title: ${title}
Excerpt: ${excerpt}
Topic: ${topic}

Respond with ONLY a JSON array of strings, nothing else. Example: ["semi truck highway sunset", "warehouse loading dock workers"]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
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

  // Get all published articles
  const { data: articles, error } = await supabaseAdmin
    .from("articles")
    .select("id, slug, title, excerpt, topic, featured_image_url")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If forceAll, migrate everything. Otherwise only non-Supabase images.
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

  const results: { slug: string; status: string }[] = [];

  for (const article of toMigrate) {
    try {
      // Get unique keywords from Claude for this specific article
      const keywords = await getImageKeywordsFromClaude(
        article.title,
        article.excerpt,
        article.topic
      );

      if (keywords.length === 0) {
        results.push({ slug: article.slug, status: "no-keywords" });
        continue;
      }

      console.log(
        `[Migrate] ${article.slug} → keywords: ${keywords.join(", ")}`
      );

      const newUrl = await findAndStoreArticleImage(article.slug, keywords);

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

      // Respect Unsplash rate limits (50 req/hour)
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
