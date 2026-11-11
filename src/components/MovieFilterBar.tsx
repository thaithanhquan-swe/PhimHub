import { Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { FILTER_OPTIONS, type FilterParams } from "@/services/movieApi";

export function MovieFilterBar({
  values,
  onChange,
  onReset,
  totalResults,
}: {
  values: FilterParams;
  onChange: (newValues: Partial<FilterParams>) => void;
  onReset: () => void;
  totalResults?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const hasActiveFilters =
    (values.type && values.type !== "all") ||
    (values.genre && values.genre !== "all") ||
    (values.country && values.country !== "all") ||
    (values.year && values.year !== "all");

  const currentTypeLabel =
    FILTER_OPTIONS.types.find((t) => t.value === (values.type || "all"))?.label || "Định dạng";
  const currentGenreLabel =
    FILTER_OPTIONS.genres.find((g) => g.value === (values.genre || "all"))?.label || "Thể loại";
  const currentCountryLabel =
    FILTER_OPTIONS.countries.find((c) => c.value === (values.country || "all"))?.label || "Quốc gia";
  const currentYearLabel =
    FILTER_OPTIONS.years.find((y) => String(y.value) === String(values.year || "all"))?.label || "Năm";

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-[#181818]/90 p-4 sm:p-5 backdrop-blur-md shadow-xl">
      {/* Header with Title and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/20 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Bộ Lọc Phim Nâng Cao</span>
              {hasActiveFilters && (
                <span className="size-2 rounded-full bg-primary animate-pulse" />
              )}
            </h3>
            {typeof totalResults === "number" && (
              <p className="text-xs text-white/50">
                Tìm thấy{" "}
                <strong className="text-primary font-semibold">
                  {totalResults.toLocaleString("vi-VN")}
                </strong>{" "}
                bộ phim phù hợp
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span>Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Filter className="size-3.5" />
            <span>{isOpen ? "Thu gọn" : "Mở bộ lọc"}</span>
          </button>
        </div>
      </div>

      {/* Filter Select Controls */}
      {isOpen && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* 1. Định dạng */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Định dạng
              </label>
              <select
                value={values.type || "all"}
                onChange={(e) => onChange({ type: e.target.value, page: 1 })}
                className="w-full rounded-xl border border-white/15 bg-[#222] px-3 py-2 text-xs sm:text-sm font-medium text-white outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {FILTER_OPTIONS.types.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1c1c1c] text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Thể loại */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Thể loại
              </label>
              <select
                value={values.genre || "all"}
                onChange={(e) => onChange({ genre: e.target.value, page: 1 })}
                className="w-full rounded-xl border border-white/15 bg-[#222] px-3 py-2 text-xs sm:text-sm font-medium text-white outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {FILTER_OPTIONS.genres.map((g) => (
                  <option key={g.value} value={g.value} className="bg-[#1c1c1c] text-white">
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Quốc gia */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Quốc gia
              </label>
              <select
                value={values.country || "all"}
                onChange={(e) => onChange({ country: e.target.value, page: 1 })}
                className="w-full rounded-xl border border-white/15 bg-[#222] px-3 py-2 text-xs sm:text-sm font-medium text-white outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {FILTER_OPTIONS.countries.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#1c1c1c] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Năm phát hành */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Năm phát hành
              </label>
              <select
                value={values.year || "all"}
                onChange={(e) => onChange({ year: e.target.value, page: 1 })}
                className="w-full rounded-xl border border-white/15 bg-[#222] px-3 py-2 text-xs sm:text-sm font-medium text-white outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {FILTER_OPTIONS.years.map((y) => (
                  <option key={y.value} value={y.value} className="bg-[#1c1c1c] text-white">
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <span className="text-xs text-white/40 mr-1">Đang chọn:</span>

              {values.type && values.type !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-1 text-xs font-medium text-white">
                  <span>{currentTypeLabel}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ type: "all", page: 1 })}
                    className="hover:text-primary transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {values.genre && values.genre !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-1 text-xs font-medium text-white">
                  <span>{currentGenreLabel}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ genre: "all", page: 1 })}
                    className="hover:text-primary transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {values.country && values.country !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-1 text-xs font-medium text-white">
                  <span>{currentCountryLabel}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ country: "all", page: 1 })}
                    className="hover:text-primary transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {values.year && values.year !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-1 text-xs font-medium text-white">
                  <span>Năm: {currentYearLabel}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ year: "all", page: 1 })}
                    className="hover:text-primary transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
