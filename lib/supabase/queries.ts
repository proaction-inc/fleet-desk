import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "./client";
import type { Article } from "./types";

async function _fetchPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error);
    return [];
  }

  return data ?? [];
}

export const getPublishedArticles = unstable_cache(
  _fetchPublishedArticles,
  ["fleet-desk-articles"],
  { tags: ["articles"], revalidate: 300 }
);

async function _fetchArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getArticleBySlug(
  slug: string
): Promise<Article | null> {
  return unstable_cache(
    () => _fetchArticleBySlug(slug),
    ["fleet-desk-article", slug],
    { tags: ["articles", `article-${slug}`], revalidate: 300 }
  )();
}

export async function getRelatedArticles(
  currentSlug: string,
  topic: string,
  limit = 3
): Promise<Article[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseAdmin
        .from("articles")
        .select("*")
        .eq("published", true)
        .eq("topic", topic)
        .neq("slug", currentSlug)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) return [];
      return data ?? [];
    },
    ["fleet-desk-related", currentSlug, topic],
    { tags: ["articles"], revalidate: 300 }
  )();
}

export function deriveCategoriesFromArticles(
  articles: Article[]
): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const article of articles) {
    counts[article.topic] = (counts[article.topic] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
