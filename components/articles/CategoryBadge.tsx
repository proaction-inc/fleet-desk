import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  "Fleet Management & Technology": "bg-blue-100 text-blue-800",
  "Regulatory & Compliance": "bg-amber-100 text-amber-800",
  "Fleet Safety": "bg-emerald-100 text-emerald-800",
  "Industry Deals": "bg-purple-100 text-purple-800",
};

export default function CategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
        categoryColors[category] ?? "bg-gray-100 text-gray-800",
        className
      )}
    >
      {category}
    </span>
  );
}
