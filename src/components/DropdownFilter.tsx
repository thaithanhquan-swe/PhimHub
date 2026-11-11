import { Check, ChevronDown } from "lucide-react";
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
  columns = 3,
  align = "left",
}: {
  label: string;
  value?: string;
  options: Option[];
  onChange: (val: string) => void;
  columns?: 2 | 3 | 4;
  align?: "left" | "right";
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
          "inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm sm:text-[15px] font-medium transition-all select-none",
          isCustomActive
            ? "text-primary font-bold bg-primary/10 border border-primary/30"
            : "text-white/80 hover:text-white hover:bg-white/10",
        )}
      >
        <span>{isCustomActive ? selectedOption?.label || label : label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 sm:size-4 text-white/60 transition-transform duration-200",
            isOpen && "rotate-180 text-white",
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
              "z-50 rounded-2xl border border-white/15 bg-[#141414]/98 backdrop-blur-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[65vh] overflow-y-auto",
              "max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:top-28 sm:absolute sm:top-full sm:mt-2",
              align === "right" ? "sm:right-0" : "sm:left-0",
              columns === 4
                ? "sm:w-[480px] md:w-[560px] grid grid-cols-2 sm:grid-cols-4 gap-1.5"
                : columns === 3
                  ? "sm:w-[390px] grid grid-cols-2 sm:grid-cols-3 gap-1.5"
                  : "grid grid-cols-2 gap-1.5",
            )}
          >
            {/* Mobile Header */}
            <div className="col-span-2 sm:hidden flex items-center justify-between pb-2 mb-1 border-b border-white/10 text-xs font-bold text-white/70">
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

            {options.map((opt) => {
              const isSelected = (value || "all") === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 min-h-[38px] text-xs sm:text-sm font-medium transition-all text-left active:scale-95",
                    isSelected
                      ? "bg-primary text-white font-bold shadow-md shadow-primary/30"
                      : "text-white/75 hover:bg-white/15 hover:text-white",
                  )}
                >
                  <span className="line-clamp-1">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
