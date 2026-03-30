import { getPublishedArticles, deriveCategoriesFromArticles } from "@/lib/supabase/queries";
import DiscoverFeed from "@/components/articles/DiscoverFeed";
import FleetSidebar from "@/components/sidebar/FleetSidebar";

export const revalidate = 300;

export default async function HomePage() {
  const articles = await getPublishedArticles();

  // Build topic counts for sidebar
  const categories = deriveCategoriesFromArticles(articles);
  const topicCounts: Record<string, number> = {};
  for (const c of categories) {
    topicCounts[c.name] = c.count;
  }

  return (
    <main className="pt-16">
      <DiscoverFeed
        articles={articles}
        sidebar={<FleetSidebar topicCounts={topicCounts} />}
      />
    </main>
  );
}
