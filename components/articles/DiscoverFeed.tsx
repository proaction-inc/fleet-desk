"use client";

import { useState, type ReactNode } from "react";
import type { Article } from "@/lib/supabase/types";
import TopicTabs from "./TopicTabs";
import ArticleCard from "./ArticleCard";
import Link from "next/link";

export default function DiscoverFeed({
  articles,
  sidebar,
}: {
  articles: Article[];
  sidebar: ReactNode;
}) {
  const [filtered, setFiltered] = useState<Article[]>(articles);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <TopicTabs articles={articles} onFilter={setFiltered} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Main feed */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted">No articles in this category yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featured && (
                    <ArticleCard article={featured} featured />
                  )}
                  {rest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                <div className="mt-10 text-center">
                  <Link
                    href="/articles"
                    className="text-sm font-semibold uppercase tracking-wider text-accent hover:text-accent-light transition-colors"
                  >
                    View all &rarr;
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          {sidebar}
        </div>
      </section>
    </>
  );
}
