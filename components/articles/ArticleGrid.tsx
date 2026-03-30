import type { Article } from "@/lib/supabase/types";
import ArticleCard from "./ArticleCard";

export default function ArticleGrid({
  articles,
  variant = "card",
}: {
  articles: Article[];
  variant?: "card" | "feed";
}) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">No articles found.</p>
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div className="divide-y divide-border">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant="feed" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article, i) => (
        <ArticleCard key={article.id} article={article} featured={i === 0} />
      ))}
    </div>
  );
}
