import { Layers } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { FranchisePart } from "@/services/movieApi";

export function FranchiseSeasonsBar({
  parts = [],
  className,
}: {
  parts: FranchisePart[];
  className?: string;
}) {
  if (!parts || parts.length <= 1) return null;

  return (
    <div className={cn("rounded-xl border border-white/10 bg-[#161618] p-4 shadow-lg", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Các phần phim liên quan ({parts.length} phần):
          </h3>
        </div>
        <span className="text-[11px] text-white/50 hidden sm:inline">Bấm để chọn phần muốn xem</span>
      </div>

      {/* Season / Part Buttons row matching user reference */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {parts.map((p) => {
          const isCurrent = p.isCurrent;
          return (
            <Link
              key={p.slug}
              to={`/movie/${p.slug}?play=true`}
              className={cn(
                "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-[13px] font-semibold transition-all shadow-sm border",
                isCurrent
                  ? "bg-[#c4ea3b] text-black border-[#c4ea3b] font-bold shadow-md shadow-[#c4ea3b]/25 hover:bg-[#d2f34e]"
                  : "bg-[#1f1f23] text-white/90 border-white/20 hover:border-white/50 hover:bg-white/10 hover:text-white",
              )}
              title={p.title}
            >
              {p.partLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
