import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublishedArticles,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/supabase/queries";
import { formatDate, estimateReadingTime } from "@/lib/utils";
import CategoryBadge from "@/components/articles/CategoryBadge";
import ArticleCard from "@/components/articles/ArticleCard";
import ShareButtons from "@/components/articles/ShareButtons";
import StickyNewsletterBar from "@/components/newsletter/StickyNewsletterBar";
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

// Generate a consistent color from the author name
function authorColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

  const related = await getRelatedArticles(article.slug, article.topic);
  const articleUrl = `https://thefleetdesk.com/articles/${article.slug}`;

  return (
    <>
      <article className="pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb — just the category */}
          <nav className="mb-8">
            <Link
              href={`/articles?topic=${encodeURIComponent(article.topic)}`}
              className="text-sm font-medium text-accent hover:text-accent-light transition-colors"
            >
              {article.topic}
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.15] mb-6">
              {article.title}
            </h1>

            {/* Author line */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full ${authorColor(article.author)} flex items-center justify-center text-white text-xs font-bold`}
              >
                {article.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {article.author}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted">
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
          </header>

          {/* Why it matters callout */}
          <div className="border-l-4 border-accent bg-surface rounded-r-lg px-5 py-4 mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1.5">
              Why it matters
            </p>
            <p className="text-base leading-relaxed text-foreground/90">
              {article.excerpt}
            </p>
          </div>

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

          {/* Content */}
          <div
            className="prose font-serif mx-auto"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Separator + Share */}
          <div className="mt-12 pt-8 border-t border-border">
            <ShareButtons url={articleUrl} title={article.title} />
          </div>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t border-border py-16 bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-bold tracking-tight mb-8">
              Keep Reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.slice(0, 3).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky newsletter bar */}
      <StickyNewsletterBar />
    </>
  );
}
