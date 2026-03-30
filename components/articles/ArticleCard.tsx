import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/supabase/types";
import { formatDate, estimateReadingTime } from "@/lib/utils";
import CategoryBadge from "./CategoryBadge";

const categoryGradients: Record<string, string> = {
  "Fleet Management & Technology": "from-blue-600/30 to-blue-900/60",
  "Regulatory & Compliance": "from-amber-600/30 to-amber-900/60",
  "Fleet Safety": "from-emerald-600/30 to-emerald-900/60",
  "Industry Deals": "from-purple-600/30 to-purple-900/60",
};

export default function ArticleCard({
  article,
  variant = "card",
  size = "default",
}: {
  article: Article;
  variant?: "card" | "feed" | "sidebar";
  size?: "default" | "small";
}) {
  // Sidebar variant — compact, for the hero grid right column
  if (variant === "sidebar") {
    return (
      <article className="group">
        <Link
          href={`/articles/${article.slug}`}
          className="flex gap-4 items-start"
        >
          <div className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-surface">
            {article.featured_image_url ? (
              <Image
                src={article.featured_image_url}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${categoryGradients[article.topic] ?? "from-gray-600/30 to-gray-900/60"}`}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CategoryBadge category={article.topic} className="mb-1.5 text-[10px]" />
            <h3 className="font-serif text-base font-bold leading-snug tracking-tight group-hover:text-accent transition-colors line-clamp-2">
              {article.title}
            </h3>
            <div className="mt-1.5 text-xs text-muted">
              {article.published_at && formatDate(article.published_at)}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // Feed variant — horizontal with image
  if (variant === "feed") {
    return (
      <article className="group py-6">
        <Link
          href={`/articles/${article.slug}`}
          className="flex gap-6 items-start"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <CategoryBadge category={article.topic} />
              {article.published_at && (
                <span className="text-xs text-muted">
                  {formatDate(article.published_at)}
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl md:text-2xl font-bold leading-snug tracking-tight group-hover:text-accent transition-colors mb-2">
              {article.title}
            </h3>
            <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-2">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground/80">
                {article.author}
              </span>
              <span>&middot;</span>
              <span>{estimateReadingTime(article.content)}</span>
            </div>
          </div>
          <div className="relative shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-lg overflow-hidden bg-surface">
            {article.featured_image_url ? (
              <Image
                src={article.featured_image_url}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${categoryGradients[article.topic] ?? "from-gray-600/30 to-gray-900/60"}`}
              />
            )}
          </div>
        </Link>
      </article>
    );
  }

  // Card variant — vertical with image (for grids)
  return (
    <article className="group">
      <Link href={`/articles/${article.slug}`} className="block">
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-4 bg-surface">
          {article.featured_image_url ? (
            <Image
              src={article.featured_image_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${categoryGradients[article.topic] ?? "from-gray-600/30 to-gray-900/60"}`}
            />
          )}
        </div>

        <CategoryBadge category={article.topic} className="mb-2" />

        <h3
          className={`font-serif font-bold leading-snug tracking-tight group-hover:text-accent transition-colors mb-2 ${size === "small" ? "text-base" : "text-lg"}`}
        >
          {article.title}
        </h3>

        <p className="text-sm text-muted leading-relaxed line-clamp-2">
          {article.excerpt}
        </p>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-foreground/80">
            {article.author}
          </span>
          <span>&middot;</span>
          {article.published_at && (
            <>
              <span>{formatDate(article.published_at)}</span>
              <span>&middot;</span>
            </>
          )}
          <span>{estimateReadingTime(article.content)}</span>
        </div>
      </Link>
    </article>
  );
}
