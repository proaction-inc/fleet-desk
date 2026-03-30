"use client";

import Link from "next/link";
import type { Article } from "@/lib/supabase/types";

// Fleet-related public companies for the stock ticker
const FLEET_STOCKS = [
  { symbol: "IOT", name: "Samsara", price: "52.34", change: "+1.2%" },
  { symbol: "PCAR", name: "PACCAR", price: "108.67", change: "+0.4%" },
  { symbol: "TFI", name: "TFI Intl", price: "134.21", change: "-0.8%" },
  { symbol: "WERN", name: "Werner", price: "38.92", change: "+0.6%" },
  { symbol: "XPO", name: "XPO", price: "143.55", change: "+1.8%" },
  { symbol: "SNDR", name: "Schneider", price: "27.14", change: "-0.3%" },
  { symbol: "R", name: "Ryder", price: "167.88", change: "+0.9%" },
  { symbol: "KNX", name: "Knight-Swift", price: "52.71", change: "+0.2%" },
];

function StockItem({ stock }: { stock: (typeof FLEET_STOCKS)[number] }) {
  const isPositive = stock.change.startsWith("+");
  return (
    <span className="inline-flex items-center gap-1.5 px-4 text-xs shrink-0">
      <span className="font-bold text-white/70">{stock.symbol}</span>
      <span className="text-white/50">${stock.price}</span>
      <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
        {stock.change}
      </span>
    </span>
  );
}

function TickerContent({ articles }: { articles: Article[] }) {
  return (
    <>
      {/* Mix of stocks and articles */}
      {articles.map((article, i) => (
        <span key={`${article.id}-${i}`} className="contents">
          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex items-center gap-3 px-5 text-sm hover:text-accent-light transition-colors shrink-0"
          >
            <span className="text-accent font-bold text-xs uppercase tracking-wider">
              {article.topic.split(" ")[0]}
            </span>
            <span className="text-white/90">{article.title}</span>
          </Link>
          {/* Insert a stock after every 2 articles */}
          {i < FLEET_STOCKS.length && (
            <>
              <span className="text-white/20 shrink-0">|</span>
              <StockItem stock={FLEET_STOCKS[i % FLEET_STOCKS.length]} />
            </>
          )}
          <span className="text-white/20 shrink-0">|</span>
        </span>
      ))}
    </>
  );
}

export default function NewsTicker({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;

  return (
    <div className="bg-foreground text-white overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-widest z-10">
          Live
        </div>
        <div className="overflow-hidden relative flex-1">
          <div className="ticker-track flex whitespace-nowrap py-2.5">
            <div className="ticker-content flex items-center shrink-0">
              <TickerContent articles={articles} />
            </div>
            <div
              className="ticker-content flex items-center shrink-0"
              aria-hidden="true"
            >
              <TickerContent articles={articles} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
