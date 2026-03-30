import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublishedArticles,
  getArticleBySlug,
  getRelatedArticles,
  getArticleSources,
} from "@/lib/supabase/queries";
import { timeAgo, estimateReadingTime } from "@/lib/utils";
import ArticleCard from "@/components/articles/ArticleCard";
import ShareButtons from "@/components/articles/ShareButtons";
import ArticleSections from "@/components/articles/ArticleSections";
import FollowUpChat from "@/components/articles/FollowUpChat";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 300;

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.published_at ?? undefined,
      authors: [article.author],
      images: article.featured_image_url
        ? [{ url: article.featured_image_url }]
        : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [related, sources] = await Promise.all([
    getRelatedArticles(article.slug, article.topic),
    getArticleSources(article.id),
  ]);

  const articleUrl = `https://thefleetdesk.com/articles/${article.slug}`;

  // Use sections from the article's JSONB column
  const sections = article.sections ?? [];
  const hasSections = sections.length > 0;

  return (
    <>
      <article className="pt-24 pb-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb + share icons row */}
          <nav className="flex items-center justify-between mb-8">
            <Link
              href={`/articles?topic=${encodeURIComponent(article.topic)}`}
              className="text-sm font-medium text-accent hover:text-accent-light transition-colors"
            >
              {article.topic}
            </Link>
            <ShareButtons url={articleUrl} title={article.title} />
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.15] mb-4">
              {article.title}
            </h1>

            {/* Meta line */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="font-medium text-foreground/80">
                {article.author}
              </span>
              <span>&middot;</span>
              {article.published_at && (
                <>
                  <span>{timeAgo(article.published_at)}</span>
                  <span>&middot;</span>
                </>
              )}
              <span>{estimateReadingTime(article.content)}</span>
            </div>
          </header>

          {/* Excerpt / summary */}
          <p className="text-lg leading-relaxed text-muted mb-8">
            {article.excerpt}
          </p>

          {/* Source cards */}
          {sources.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-10 -mx-1 px-1 scrollbar-hide">
              {sources.slice(0, 4).map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none w-56 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-4 group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-accent uppercase">
                        {source.domain.replace(/^www\./, "").charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted truncate">
                      {source.domain.replace(/^www\./, "")}
                    </span>
                    <svg
                      className="w-3 h-3 text-muted/50 ml-auto shrink-0 group-hover:text-accent transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {source.title}
                  </p>
                </a>
              ))}
            </div>
          )}

          {/* Featured image */}
          {article.featured_image_url && (
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-10 bg-surface">
              <Image
                src={article.featured_image_url}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content — sections or fallback to raw HTML */}
          {hasSections ? (
            <ArticleSections
              sections={sections}
              sources={sources}
              slug={article.slug}
            />
          ) : (
            <div
              className="prose font-serif mx-auto"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}
        </div>
      </article>

      {/* Discover more — horizontal scrolling related articles */}
      {related.length > 0 && (
        <section className="border-t border-border py-16 bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight mb-8">
              Discover more
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
              {related.slice(0, 6).map((relatedArticle) => (
                <div key={relatedArticle.id} className="flex-none w-72">
                  <ArticleCard article={relatedArticle} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Follow-up chat */}
      <FollowUpChat articleId={article.id} />
    </>
  );
}
