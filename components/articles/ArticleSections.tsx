"use client";

import { useState } from "react";
import type { ArticleSource } from "@/lib/supabase/types";

interface Section {
  heading: string;
  content: string;
  source_domains: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CopyButton({
  text,
  label,
  icon,
}: {
  text: string;
  label: string;
  icon: "link" | "copy";
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-surface transition-colors"
      aria-label={label}
      title={label}
    >
      {copied ? (
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : icon === "link" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function ArticleSections({
  sections,
  sources,
  slug,
}: {
  sections: Section[];
  sources: ArticleSource[];
  slug: string;
}) {
  // Map source domains to their URLs
  const sourceMap = new Map<string, ArticleSource>();
  for (const src of sources) {
    if (!sourceMap.has(src.domain)) {
      sourceMap.set(src.domain, src);
    }
  }

  return (
    <div className="space-y-8">
      {sections.map((section, i) => {
        const sectionSlug = slugify(section.heading);
        const sectionUrl = `https://thefleetdesk.com/articles/${slug}#${sectionSlug}`;

        return (
          <section key={i} id={sectionSlug}>
            {/* Section header with action buttons */}
            <div className="flex items-start justify-between gap-3 mb-4 group">
              <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight leading-snug text-foreground">
                {section.heading}
              </h2>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                <CopyButton
                  text={sectionUrl}
                  label="Copy link to section"
                  icon="link"
                />
                <CopyButton
                  text={section.content}
                  label="Copy section content"
                  icon="copy"
                />
              </div>
            </div>

            {/* Section content */}
            <div
              className="prose font-serif"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />

            {/* Source citations */}
            {section.source_domains.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {section.source_domains.map((domain) => {
                  const source = sourceMap.get(domain);
                  const shortDomain = domain
                    .replace(/^www\./, "")
                    .replace(/\.com$|\.org$|\.net$/, "");

                  if (source) {
                    return (
                      <a
                        key={domain}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface text-xs font-medium text-muted hover:text-accent hover:bg-surface-hover transition-colors border border-border/50"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                        {shortDomain}
                      </a>
                    );
                  }

                  return (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface text-xs font-medium text-muted border border-border/50"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-muted/30" />
                      {shortDomain}
                    </span>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
