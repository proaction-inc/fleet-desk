"use client";

import { useState } from "react";

export default function NewsletterSignup({ variant = "inline" }: { variant?: "inline" | "banner" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

  if (variant === "banner") {
    return (
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Stay ahead of the fleet
          </h2>
          <p className="text-slate-300 text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Get the stories that matter. Delivered daily and weekly.
          </p>
          {status === "success" ? (
            <div className="py-4">
              <p className="text-white text-lg font-semibold">You&apos;re in. Watch your inbox.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-5 py-3.5 rounded-lg text-foreground bg-white placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-8 py-3.5 rounded-lg bg-white text-slate-900 font-semibold text-base hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {status === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="mt-4 text-slate-400 text-sm">Something went wrong. Please try again.</p>
          )}
          <p className="mt-8 text-slate-500 text-sm tracking-wide">
            Trusted by fleet managers, safety directors, and operations leaders
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="border border-border rounded-lg px-6 py-5">
      <h3 className="font-serif text-xl font-bold tracking-tight mb-0.5">Fleet Desk Weekly</h3>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        The 5 stories fleet managers need this week. Every Friday.
      </p>
      {status === "success" ? (
        <p className="text-sm font-semibold text-accent">You&apos;re subscribed!</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-3 py-2 rounded-md border border-border text-base bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-2 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            {status === "loading" ? "..." : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">Something went wrong.</p>
      )}
      <p className="mt-3 text-xs text-muted">
        Join fleet professionals who start their week informed
      </p>
    </div>
  );
}
