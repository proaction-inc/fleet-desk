"use client";

import { useState } from "react";
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

function SourceCircles({ count }: { count: number }) {
  // For now, all articles source from The Fleet Desk
  // When the content engine runs, this will show real external logos
  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        <div
          className="rounded-full border-2 border-white overflow-hidden"
          style={{ zIndex: 10 }}
        >
          {/* Use our own favicon for Fleet Desk */}
          <img
            src="/icon"
            alt="The Fleet Desk"
            width={20}
            height={20}
            className="rounded-full bg-accent"
            style={{ width: 20, height: 20 }}
          />
        </div>
      </div>
      <span className="ml-2 text-xs text-muted">
        {count} {count === 1 ? "source" : "sources"}
      </span>
    </div>
  );
}

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
}) {
  const [liked, setLiked] = useState(false);
  const sourceCount = article.source_count ?? 0;

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
            <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-3">
              {sourceCount > 0 && (
                <SourceCircles count={sourceCount} />
              )}
              <span className="text-xs text-muted">{estimateReadingTime(article.content)}</span>
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
      className={`group relative ${featured ? "col-span-1 md:col-span-2" : ""}`}
    >
      {/* Main clickable area */}
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

        {/* Source circles + timestamp row */}
        <div className="flex items-center gap-3 mb-1.5">
          {sourceCount > 0 && (
            <SourceCircles count={sourceCount} />
          )}
          {article.published_at && (
            <>
              {sourceCount > 0 && <span className="text-muted/30">|</span>}
              <span className="text-xs text-muted">
                {timeAgo(article.published_at)}
              </span>
            </>
          )}
        </div>

        {/* Excerpt */}
        <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
          {article.excerpt}
        </p>
      </Link>

      {/* Action buttons — OUTSIDE the link so clicks don't navigate */}
      <div className="flex items-center justify-end gap-1">
        {/* Like / heart button */}
        <button
          type="button"
          className={`p-1.5 rounded-full transition-colors ${
            liked
              ? "text-red-500 bg-red-50"
              : "text-muted hover:text-red-500 hover:bg-red-50"
          }`}
          aria-label={liked ? "Unlike" : "Like"}
          onClick={() => setLiked(!liked)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Three dots actions menu */}
        <button
          type="button"
          className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="More actions"
          onClick={() => {
            // Future: open a dropdown with Share, Bookmark, Report options
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
