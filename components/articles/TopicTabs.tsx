"use client";

import { useState } from "react";
import type { Article } from "@/lib/supabase/types";

const TABS = [
  { label: "Top", topic: null },
  { label: "Technology", topic: "Fleet Management & Technology" },
  { label: "Regulatory", topic: "Regulatory & Compliance" },
  { label: "Safety", topic: "Fleet Safety" },
  { label: "Deals & M&A", topic: "Industry Deals" },
] as const;

export default function TopicTabs({
  articles,
  onFilter,
}: {
  articles: Article[];
  onFilter: (filtered: Article[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<string>("Top");

  function handleTabClick(label: string, topic: string | null) {
    setActiveTab(label);
    if (topic === null) {
      onFilter(articles);
    } else {
      onFilter(articles.filter((a) => a.topic === topic));
    }
  }

  return (
    <div className="border-b border-border bg-background sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.label;
            return (
              <button
                key={tab.label}
                onClick={() => handleTabClick(tab.label, tab.topic)}
                className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
