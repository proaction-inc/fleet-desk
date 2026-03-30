import {
  getPublishedArticles,
  deriveCategoriesFromArticles,
} from "@/lib/supabase/queries";
import ArticleGrid from "@/components/articles/ArticleGrid";
import CategoryFilter from "@/components/articles/CategoryFilter";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { Suspense } from "react";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Articles",
  description:
    "Browse all fleet industry news, analysis, and deep dives from The Fleet Desk.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const articles = await getPublishedArticles();
  const categories = deriveCategoriesFromArticles(articles);

  const filtered = topic
    ? articles.filter((a) => a.topic === topic)
    : articles;

  return (
    <main className="pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-8 mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {topic ?? "All Articles"}
          </h1>
          <p className="text-sm text-muted">
            {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Suspense>
          <CategoryFilter categories={categories} />
        </Suspense>

        <ArticleGrid articles={filtered} variant="feed" />

        <div className="mt-16 pt-8 border-t border-border max-w-md" id="newsletter">
          <NewsletterSignup />
        </div>
      </div>
    </main>
  );
}
