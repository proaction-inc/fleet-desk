"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  "Fleet Management & Technology": "Technology",
  "Regulatory & Compliance": "Regulatory",
  "Fleet Safety": "Safety",
  "Industry Deals": "Deals & M&A",
};

export default function CategoryFilter({
  categories,
}: {
  categories: { name: string; count: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTopic = searchParams.get("topic");

  function handleClick(topic: string | null) {
    if (topic) {
      router.push(`/articles?topic=${encodeURIComponent(topic)}`);
    } else {
      router.push("/articles");
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-border">
      <button
        onClick={() => handleClick(null)}
        className={cn(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
          !activeTopic
            ? "bg-foreground text-white"
            : "bg-surface text-muted hover:bg-surface-hover"
        )}
      >
        All
      </button>
      {categories.map(({ name, count }) => (
        <button
          key={name}
          onClick={() => handleClick(name)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
            activeTopic === name
              ? "bg-foreground text-white"
              : "bg-surface text-muted hover:bg-surface-hover"
          )}
        >
          {categoryLabels[name] ?? name} ({count})
        </button>
      ))}
    </div>
  );
}
