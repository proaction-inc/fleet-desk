import { getPublishedArticles } from "@/lib/supabase/queries";
import FeaturedArticle from "@/components/articles/FeaturedArticle";
import ArticleCard from "@/components/articles/ArticleCard";
import NewsTicker from "@/components/articles/NewsTicker";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import Link from "next/link";

export const revalidate = 300;

export default async function HomePage() {
  const articles = await getPublishedArticles();

  const featured = articles[0];
  const sidebarStories = articles.slice(1, 4);
  const gridStories = articles.slice(4);

  return (
    <main className="pt-16">
      {/* News ticker */}
      <NewsTicker articles={articles} />

      {/* Hero section: featured + sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured story — takes 2/3 */}
          <div className="lg:col-span-2">
            {featured && <FeaturedArticle article={featured} />}
          </div>

          {/* Sidebar stories — takes 1/3 */}
          <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Top Stories
            </h3>
            {sidebarStories.map((article, i) => (
              <div key={article.id}>
                <ArticleCard article={article} variant="sidebar" />
                {i < sidebarStories.length - 1 && (
                  <hr className="mt-6 border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest articles grid — full width with images */}
      {gridStories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-border">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
              Latest
            </h2>
            <Link
              href="/articles"
              className="text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent-light transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gridStories.map((article) => (
              <ArticleCard key={article.id} article={article} size="small" />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter CTA — bottom of page, before footer */}
      <div id="newsletter" className="mt-8">
        <NewsletterSignup variant="banner" />
      </div>
    </main>
  );
}
