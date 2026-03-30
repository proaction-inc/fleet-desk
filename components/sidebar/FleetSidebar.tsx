const FLEET_STOCKS = [
  { symbol: "IOT", name: "Samsara", price: "$52.34", change: "+1.2%" },
  { symbol: "PCAR", name: "PACCAR", price: "$108.67", change: "+0.4%" },
  { symbol: "R", name: "Ryder", price: "$167.88", change: "+0.9%" },
  { symbol: "KNX", name: "Knight-Swift", price: "$52.71", change: "+0.2%" },
  { symbol: "XPO", name: "XPO", price: "$143.55", change: "+1.8%" },
];

const TOPICS = [
  { label: "Technology", topic: "Fleet Management & Technology" },
  { label: "Regulatory", topic: "Regulatory & Compliance" },
  { label: "Safety", topic: "Fleet Safety" },
  { label: "Deals & M&A", topic: "Industry Deals" },
];

export default function FleetSidebar({
  topicCounts,
}: {
  topicCounts: Record<string, number>;
}) {
  return (
    <aside className="hidden lg:block w-80 shrink-0 space-y-8">
      {/* Fleet Market Data */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Fleet Market Data
        </h3>
        <div className="space-y-3">
          {FLEET_STOCKS.map((stock) => {
            const isPositive = stock.change.startsWith("+");
            return (
              <div
                key={stock.symbol}
                className="flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-bold text-foreground">
                    {stock.symbol}
                  </span>
                  <span className="ml-2 text-xs text-muted">{stock.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    {stock.price}
                  </span>
                  <span
                    className={`ml-2 text-xs font-semibold ${
                      isPositive ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {stock.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Trending Topics
        </h3>
        <div className="space-y-3">
          {TOPICS.map((t) => {
            const count = topicCounts[t.topic] ?? 0;
            return (
              <div
                key={t.topic}
                className="flex items-center justify-between group cursor-pointer"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  {t.label}
                </span>
                <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full">
                  {count} article{count !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
