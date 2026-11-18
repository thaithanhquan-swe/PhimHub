import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

export function DropdownFilter({
  label,
  value,
  options,
  onChange,
  columns = 1,
  align = "left",
  theme = "default",
}: {
  label: string;
  value?: string;
  options: Option[];
  onChange: (val: string) => void;
  columns?: 1 | 2 | 3 | 4;
  align?: "left" | "right";
  theme?: "default" | "imdb";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const isCustomActive = value && value !== "all";

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm sm:text-[15px] font-medium transition-all select-none whitespace-nowrap",
          isCustomActive
            ? theme === "imdb"
              ? "text-amber-300 font-bold bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/15 shadow-sm shadow-amber-400/5"
              : "text-primary font-bold bg-primary/10 border border-primary/30 hover:bg-primary/15"
            : "text-white/80 hover:text-white hover:bg-white/10 border border-white/10",
        )}
      >
        {theme === "imdb" ? (
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-[#f5c518] px-1 py-0.5 text-[9px] font-black text-black leading-none">
              IMDb
            </span>
            <span className="truncate max-w-[170px]">
              {isCustomActive ? `≥ ${value} điểm` : label}
            </span>
          </div>
        ) : (
          <span className="truncate max-w-[170px]">
            {isCustomActive ? selectedOption?.label || label : label}
          </span>
        )}
        <ChevronDown
          className={cn(
            "size-3.5 sm:size-4 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180",
            isCustomActive && theme === "imdb"
              ? "text-amber-300"
              : isCustomActive
                ? "text-primary"
                : "text-white/60",
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={cn(
              "z-50 rounded-2xl border border-white/15 bg-[#141414]/98 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[65vh] overflow-y-auto",
              "max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:top-28 sm:absolute sm:top-full sm:mt-2",
              align === "right" ? "sm:right-0" : "sm:left-0",
              columns === 4
                ? "w-[360px] sm:w-[540px] grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-3"
                : columns === 3
                  ? "w-[320px] sm:w-[420px] grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2.5"
                  : columns === 2
                    ? "w-[280px] sm:w-[320px] grid grid-cols-2 gap-1.5 p-2"
                    : theme === "imdb"
                      ? "w-[250px] sm:w-[280px] flex flex-col gap-1 p-2"
                      : "w-[240px] sm:w-[270px] flex flex-col gap-1 p-1.5",
            )}
          >
            {/* Mobile Header */}
            <div className="sm:hidden flex items-center justify-between pb-2 mb-1 border-b border-white/10 text-xs font-bold text-white/70">
              <span>Chọn {label}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white px-2 py-0.5 rounded"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Subtle category header for IMDb */}
            {theme === "imdb" && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 mb-1 text-[11px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/5">
                <Star className="size-3 text-[#f5c518] fill-[#f5c518]" />
                <span>Lọc theo điểm IMDb</span>
              </div>
            )}

            {options.map((opt) => {
              const isSelected = (value || "all") === opt.value;
              const isImdbScore = theme === "imdb" && opt.value !== "all";

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all text-left active:scale-[0.98] group",
                    theme === "imdb"
                      ? isSelected
                        ? "bg-amber-400/20 border border-amber-400/40 text-amber-200 font-bold shadow-sm shadow-amber-400/10"
                        : "text-white/80 hover:bg-white/10 hover:text-white border border-transparent"
                      : isSelected
                        ? "bg-primary text-white font-bold shadow-md shadow-primary/30"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {isImdbScore ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[#f5c518] font-bold text-xs shrink-0 group-hover:border-amber-400/30">
                        <Star className="size-3 fill-[#f5c518] text-[#f5c518]" />
                        <span>{opt.value}+</span>
                      </span>
                      <span className="truncate text-xs sm:text-sm">{opt.label}</span>
                    </div>
                  ) : (
                    <span className="truncate whitespace-nowrap">{opt.label}</span>
                  )}

                  {isSelected && (
                    <Check
                      className={cn(
                        "size-4 shrink-0 ml-2",
                        theme === "imdb" ? "text-amber-400" : "text-white",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
