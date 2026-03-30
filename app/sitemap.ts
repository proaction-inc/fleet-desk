import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/supabase/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `https://thefleetdesk.com/articles/${article.slug}`,
    lastModified: article.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: "https://thefleetdesk.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://thefleetdesk.com/articles",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://thefleetdesk.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...articleEntries,
  ];
}
