import { RotateCcw, X } from "lucide-react";

import { DropdownFilter } from "@/components/DropdownFilter";
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
  const hasActiveFilters =
    (values.genre && values.genre !== "all") ||
    (values.country && values.country !== "all") ||
    (values.year && values.year !== "all") ||
    (values.imdb && values.imdb !== "all");

  const currentGenreLabel =
    FILTER_OPTIONS.genres.find((g) => g.value === (values.genre || "all"))?.label || "Thể loại";
  const currentCountryLabel =
    FILTER_OPTIONS.countries.find((c) => c.value === (values.country || "all"))?.label || "Quốc gia";
  const currentYearLabel =
    FILTER_OPTIONS.years.find((y) => String(y.value) === String(values.year || "all"))?.label || "Năm";
  const currentImdbLabel =
    FILTER_OPTIONS.imdbRatings.find((r) => String(r.value) === String(values.imdb || "all"))?.label || "Điểm IMDb";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      {/* Sleek Minimalist Dropdown Filters matching user's screenshot: Thể loại ⌵   Quốc gia ⌵   Năm ⌵ */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <DropdownFilter
          label="Thể loại"
          value={values.genre || "all"}
          options={FILTER_OPTIONS.genres}
          onChange={(val) => onChange({ genre: val, page: 1 })}
          columns={4}
        />

        <DropdownFilter
          label="Quốc gia"
          value={values.country || "all"}
          options={FILTER_OPTIONS.countries}
          onChange={(val) => onChange({ country: val, page: 1 })}
          columns={3}
        />

        <DropdownFilter
          label="Năm"
          value={values.year ? String(values.year) : "all"}
          options={FILTER_OPTIONS.years}
          onChange={(val) => onChange({ year: val, page: 1 })}
          columns={1}
        />

        <DropdownFilter
          label="Điểm IMDb"
          value={values.imdb ? String(values.imdb) : "all"}
          options={FILTER_OPTIONS.imdbRatings}
          onChange={(val) => onChange({ imdb: val, page: 1 })}
          columns={1}
          theme="imdb"
        />
      </div>

      {/* Right side: Count & Reset */}
      <div className="flex items-center gap-3 ml-auto">
        {typeof totalResults === "number" && (
          <span className="text-xs text-white/50 hidden sm:inline">
            Tìm thấy <strong className="text-white font-semibold">{totalResults.toLocaleString("vi-VN")}</strong> phim
          </span>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <RotateCcw className="size-3" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* Active tags (if any specific filter is selected) */}
      {hasActiveFilters && (
        <div className="w-full flex flex-wrap items-center gap-2 pt-2">
          {values.genre && values.genre !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs text-white">
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs text-white">
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs text-white">
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

          {values.imdb && values.imdb !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-2.5 py-0.5 text-xs text-amber-300">
              <span className="rounded bg-[#f5c518] px-1 py-0.5 text-[9px] font-black text-black leading-none shadow-xs">
                IMDb
              </span>
              <span>{currentImdbLabel}</span>
              <button
                type="button"
                onClick={() => onChange({ imdb: "all", page: 1 })}
                className="hover:text-amber-100 transition-colors"
                aria-label="Xóa bộ lọc điểm IMDb"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
