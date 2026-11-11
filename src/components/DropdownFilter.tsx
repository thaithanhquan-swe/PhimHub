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
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <div
          className={cn(
            "absolute top-full mt-2 z-50 rounded-2xl border border-white/15 bg-[#141414]/98 backdrop-blur-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0",
            columns === 4
              ? "w-[340px] sm:w-[480px] md:w-[560px] grid grid-cols-2 sm:grid-cols-4 gap-1.5"
              : columns === 3
                ? "w-[290px] sm:w-[390px] grid grid-cols-2 sm:grid-cols-3 gap-1.5"
                : "w-[240px] grid grid-cols-2 gap-1.5",
          )}
        >
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
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all text-left",
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
      )}
    </div>
  );
}
