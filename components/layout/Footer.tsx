import Link from "next/link";

const topics = [
  { label: "Technology", href: "/articles?topic=Fleet+Management+%26+Technology" },
  { label: "Regulatory", href: "/articles?topic=Regulatory+%26+Compliance" },
  { label: "Safety", href: "/articles?topic=Fleet+Safety" },
  { label: "Deals & M&A", href: "/articles?topic=Industry+Deals" },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Left: brand + about */}
          <div className="max-w-sm">
            <Link href="/" className="flex items-baseline gap-1.5 mb-3">
              <span className="text-xs font-medium tracking-widest uppercase text-slate-500">
                The
              </span>
              <span className="text-xl font-bold font-serif tracking-tight text-white">
                Fleet Desk
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Independent fleet industry intelligence. Daily news, weekly analysis, and the stories that matter.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/about"
                className="text-slate-400 hover:text-white transition-colors"
              >
                About
              </Link>
              <span className="text-slate-700">|</span>
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                aria-label="Follow on LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

          {/* Right: topic links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Topics
            </h4>
            <ul className="space-y-2">
              {topics.map((topic) => (
                <li key={topic.href}>
                  <Link
                    href={topic.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {topic.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} The Fleet Desk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
