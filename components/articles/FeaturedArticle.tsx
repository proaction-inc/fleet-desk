import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/supabase/types";
import { formatDate, estimateReadingTime } from "@/lib/utils";
import CategoryBadge from "./CategoryBadge";

export default function FeaturedArticle({ article }: { article: Article }) {
  return (
    <article>
      <Link href={`/articles/${article.slug}`} className="group block">
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-xl overflow-hidden bg-surface mb-5">
          {article.featured_image_url ? (
            <Image
              src={article.featured_image_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <CategoryBadge
              category={article.topic}
              className="mb-3 bg-white/20 text-white backdrop-blur-sm"
            />
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white mb-3">
              {article.title}
            </h2>
            <p className="hidden sm:block text-white/80 text-base md:text-lg leading-relaxed max-w-2xl mb-4">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="font-medium text-white/80">{article.author}</span>
              <span>&middot;</span>
              {article.published_at && (
                <>
                  <span>{formatDate(article.published_at)}</span>
                  <span>&middot;</span>
                </>
              )}
              <span>{estimateReadingTime(article.content)}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
