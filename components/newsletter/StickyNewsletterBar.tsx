"use client";

import { useState, useEffect } from "react";

export default function StickyNewsletterBar() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPercent >= 0.3);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (dismissed || status === "success") return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
        <p className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
          Get <span className="font-bold">Fleet Desk Daily</span> — the fleet industry&apos;s morning briefing
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 flex-1 min-w-0">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-md border border-border text-sm bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-1.5 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {status === "loading" ? "..." : "Subscribe"}
          </button>
        </form>

        <button
          onClick={() => setDismissed(true)}
          className="absolute top-1/2 -translate-y-1/2 right-3 sm:relative sm:top-auto sm:translate-y-0 sm:right-auto p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {status === "error" && (
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <p className="text-xs text-red-600">Something went wrong. Try again.</p>
        </div>
      )}
    </div>
  );
}
