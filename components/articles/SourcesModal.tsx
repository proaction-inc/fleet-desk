"use client";

import { useState } from "react";
import type { ArticleSource } from "@/lib/supabase/types";

/**
 * Get a favicon/logo URL for any domain.
 * - For The Fleet Desk, use our own favicon
 * - For external domains, use Google's favicon service (returns real logos)
 */
function getDomainLogoUrl(domain: string, size: number = 32): string {
  const clean = domain.replace(/^www\./, "");
  if (clean === "thefleetdesk.com") {
    return "/icon"; // Our generated favicon route
  }
  // Google's favicon service — works for any domain, returns the actual site logo
  return `https://www.google.com/s2/favicons?domain=${clean}&sz=${size}`;
}

function SourceLogo({
  domain,
  size = 20,
  className = "",
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const clean = domain.replace(/^www\./, "");
  const isFleetDesk = clean === "thefleetdesk.com";

  return (
    <img
      src={getDomainLogoUrl(clean, size * 2)}
      alt={clean}
      width={size}
      height={size}
      className={`rounded-full object-cover ${isFleetDesk ? "bg-accent" : "bg-surface"} ${className}`}
      style={{ width: size, height: size }}
    />
  );
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
  const uniqueDomains = [
    ...new Set(sources.map((s) => s.domain.replace(/^www\./, ""))),
  ];
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
              className="rounded-full border-2 border-background overflow-hidden"
              style={{ zIndex: 10 - i }}
            >
              <SourceLogo domain={domain} size={20} />
            </div>
          ))}
        </div>
        <span className="text-xs font-medium text-muted hover:text-foreground transition-colors">
          {displayCount} {displayCount === 1 ? "source" : "sources"}
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
            className="relative bg-background rounded-xl shadow-2xl border border-border w-full max-w-md m-4 mt-20 mr-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between rounded-t-xl">
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
                <span className="font-bold text-lg">
                  {displayCount} {displayCount === 1 ? "source" : "sources"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                    {/* Domain badge with real logo */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <SourceLogo domain={cleanDomain} size={24} />
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
