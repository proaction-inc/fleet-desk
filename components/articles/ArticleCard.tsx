"use client";

import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/supabase/types";
import { timeAgo, estimateReadingTime } from "@/lib/utils";
import CategoryBadge from "./CategoryBadge";

const categoryGradients: Record<string, string> = {
  "Fleet Management & Technology": "from-blue-600/30 to-blue-900/60",
  "Regulatory & Compliance": "from-amber-600/30 to-amber-900/60",
  "Fleet Safety": "from-emerald-600/30 to-emerald-900/60",
  "Industry Deals": "from-purple-600/30 to-purple-900/60",
};

function ArticleImage({
  article,
  className,
}: {
  article: Article;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {article.featured_image_url ? (
        <Image
          src={article.featured_image_url}
          alt={article.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${
            categoryGradients[article.topic] ?? "from-gray-600/30 to-gray-900/60"
          }`}
        />
      )}
    </div>
  );
}

export default function ArticleCard({
  article,
  variant = "card",
  featured = false,
}: {
  article: Article;
  variant?: "card" | "feed";
  featured?: boolean;
  /** @deprecated — no longer used, kept for backward compat */
  size?: "default" | "small";
}) {
  const sourceCount = article.source_count;

  // Feed variant — horizontal layout used on /articles page
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
                  {timeAgo(article.published_at)}
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
              {sourceCount != null && sourceCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="text-accent font-medium">
                    {sourceCount} sources
                  </span>
                </>
              )}
            </div>
          </div>
          <ArticleImage
            article={article}
            className="shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-lg"
          />
        </Link>
      </article>
    );
  }

  // Card variant — Perplexity Discover style (default)
  return (
    <article
      className={`group ${featured ? "col-span-1 md:col-span-2" : ""}`}
    >
      <Link href={`/articles/${article.slug}`} className="block">
        {/* Hero image */}
        <ArticleImage
          article={article}
          className={`rounded-xl mb-3 ${
            featured ? "aspect-[2/1]" : "aspect-[16/10]"
          }`}
        />

        {/* Headline */}
        <h3
          className={`font-serif font-bold leading-snug tracking-tight group-hover:text-accent transition-colors mb-1.5 ${
            featured ? "text-xl md:text-2xl" : "text-base"
          }`}
        >
          {article.title}
        </h3>

        {/* Timestamp */}
        <p className="text-xs text-muted mb-1.5">
          {article.published_at ? timeAgo(article.published_at) : "Draft"}
        </p>

        {/* Excerpt */}
        <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
          {article.excerpt}
        </p>

        {/* Bottom row: source count, like, actions */}
        <div className="flex items-center gap-3">
          {sourceCount != null && sourceCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
              {sourceCount} sources
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Like button */}
            <button
              type="button"
              className="p-1.5 rounded-full text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Like"
              onClick={(e) => e.preventDefault()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* Actions menu button */}
            <button
              type="button"
              className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label="More actions"
              onClick={(e) => e.preventDefault()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
