"use client";

import Link from "next/link";
import { useState } from "react";

const categories = [
  { label: "Technology", href: "/articles?topic=Fleet+Management+%26+Technology" },
  { label: "Regulatory", href: "/articles?topic=Regulatory+%26+Compliance" },
  { label: "Safety", href: "/articles?topic=Fleet+Safety" },
  { label: "Deals & M&A", href: "/articles?topic=Industry+Deals" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Masthead logo */}
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium tracking-widest uppercase text-muted">
              The
            </span>
            <span className="text-2xl font-bold font-serif tracking-tight text-foreground">
              Fleet Desk
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {categories.map((cat, i) => (
              <span key={cat.href} className="flex items-center">
                <Link
                  href={cat.href}
                  className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  {cat.label}
                </Link>
                {i < categories.length - 1 && (
                  <span className="text-border">|</span>
                )}
              </span>
            ))}
            <Link
              href="#newsletter"
              className="ml-4 px-4 py-1.5 text-sm font-semibold rounded-full bg-accent text-white hover:bg-accent-light transition-colors"
            >
              Subscribe
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-muted hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-4 space-y-1">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
              >
                {cat.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border mt-3">
              <Link
                href="#newsletter"
                onClick={() => setMobileOpen(false)}
                className="block text-center px-4 py-2.5 text-sm font-semibold rounded-full bg-accent text-white hover:bg-accent-light transition-colors"
              >
                Subscribe
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
