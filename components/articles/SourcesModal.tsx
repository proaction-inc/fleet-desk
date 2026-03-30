"use client";

import { useState } from "react";
import type { ArticleSource } from "@/lib/supabase/types";

// Domain color mapping
const domainColors: Record<string, string> = {
  "thefleetdesk.com": "#0c6e4f",
  "ttnews.com": "#dc2626",
  "freightwaves.com": "#2563eb",
  "fleetowner.com": "#16a34a",
  "ccjdigital.com": "#7c3aed",
  "fmcsa.dot.gov": "#1d4ed8",
  "samsara.com": "#059669",
  "trucking.org": "#b45309",
  "pwc.com": "#dc2626",
  "nsc.org": "#0369a1",
};

function getDomainColor(domain: string): string {
  const clean = domain.replace(/^www\./, "");
  return domainColors[clean] ?? "#64748b";
}

function getDomainInitial(domain: string): string {
  return domain.replace(/^www\./, "").charAt(0).toUpperCase();
}

export function SourceCirclesClickable({
  sources,
  sourceCount,
}: {
  sources: ArticleSource[];
  sourceCount: number;
}) {
  const [open, setOpen] = useState(false);
  const displayCount = sourceCount || sources.length;

  // Get unique domains for circles
  const uniqueDomains = [...new Set(sources.map((s) => s.domain.replace(/^www\./, "")))];
  const displayDomains = uniqueDomains.slice(0, 4);

  if (displayCount === 0) return null;

  return (
    <>
      {/* Clickable source circles */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <div className="flex -space-x-1.5">
          {displayDomains.map((domain, i) => (
            <div
              key={domain}
              className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
              style={{
                backgroundColor: getDomainColor(domain),
                zIndex: 10 - i,
              }}
            >
              {getDomainInitial(domain)}
            </div>
          ))}
        </div>
        <span className="text-xs font-medium text-muted hover:text-foreground transition-colors">
          {displayCount} sources
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Modal panel */}
          <div
            className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md m-4 mt-20 mr-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="font-bold text-lg">{displayCount} sources</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Source list */}
            <div className="divide-y divide-border">
              {sources.map((source) => {
                const cleanDomain = source.domain.replace(/^www\./, "");
                return (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-5 py-4 hover:bg-surface transition-colors"
                  >
                    {/* Domain badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: getDomainColor(cleanDomain) }}
                      >
                        {getDomainInitial(cleanDomain)}
                      </div>
                      <span className="text-sm font-medium text-muted">
                        {cleanDomain}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-foreground leading-snug mb-1">
                      {source.title}
                    </h4>

                    {/* Snippet */}
                    {source.snippet && (
                      <p className="text-sm text-muted leading-relaxed line-clamp-3">
                        {source.snippet}
                      </p>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
