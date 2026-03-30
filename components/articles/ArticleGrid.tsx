import type { Article } from "@/lib/supabase/types";
import ArticleCard from "./ArticleCard";

export default function ArticleGrid({
  articles,
  variant = "grid",
}: {
  articles: Article[];
  variant?: "grid" | "feed";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
