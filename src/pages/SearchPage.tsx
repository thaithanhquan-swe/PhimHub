import { Clapperboard, Flame, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieCard } from "@/components/MovieCard";
import { RequestError } from "@/components/RequestState";
import type { Movie } from "@/data/movies";
import { useSyncSearch } from "@/hooks/useSyncSearch";
import { cn } from "@/lib/utils";
import {
  getMoviesByCategory,
  getMoviesByGenre,
  getNewUpdatedMovies,
  searchMovies,
} from "@/services/movieApi";

const QUICK_FILTERS = [
  { label: "Mới cập nhật", type: "new", slug: "" },
  { label: "Phim bộ", type: "cat", slug: "phim-bo" },
  { label: "Phim lẻ", type: "cat", slug: "phim-le" },
  { label: "Hoạt hình", type: "genre", slug: "hoat-hinh" },
  { label: "Hành động", type: "genre", slug: "hanh-dong" },
  { label: "Kinh dị", type: "genre", slug: "kinh-di" },
  { label: "Tình cảm", type: "genre", slug: "tinh-cam" },
  { label: "Hài hước", type: "genre", slug: "hai" },
  { label: "Khoa học viễn tưởng", type: "genre", slug: "khoa-hoc-vien-tuong" },
  { label: "TV Shows", type: "cat", slug: "tv-shows" },
];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeFilter, setActiveFilter] = useState<string>("Mới cập nhật");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHoveringDropdown, setIsHoveringDropdown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { syncSearch, error: telemetryError } = useSyncSearch();

  // Đóng dropdown khi click ra ngoài vùng search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(input.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (debouncedQuery) {
      document.title = `Tìm kiếm: "${debouncedQuery}" | PhimHub`;
      void syncSearch(debouncedQuery);
    } else {
      document.title = `${activeFilter} - Tìm Phim | PhimHub`;
    }
  }, [debouncedQuery, activeFilter, syncSearch]);

  const activeQuickFilter = QUICK_FILTERS.find((filter) => filter.label === activeFilter) || QUICK_FILTERS[0];
  const resultsQuery = useQuery({
    queryKey: debouncedQuery
      ? ["movie-search", debouncedQuery]
      : ["quick-filter", activeQuickFilter.type, activeQuickFilter.slug],
    queryFn: ({ signal }) => {
      if (debouncedQuery) return searchMovies(debouncedQuery, 1, signal);
      if (activeQuickFilter.type === "cat") {
        return getMoviesByCategory(activeQuickFilter.slug, 1, signal);
      }
      if (activeQuickFilter.type === "genre") {
        return getMoviesByGenre(activeQuickFilter.slug, 1, signal);
      }
      return getNewUpdatedMovies(1, signal);
    },
  });
  const results = resultsQuery.data ?? [];
  const loading = resultsQuery.isLoading;
  const error = resultsQuery.error;
  const suggestions =
    input.trim().length >= 2 && input.trim() === debouncedQuery ? results.slice(0, 5) : [];

  // Tự động ẩn dropdown sau khoảng 3, 4 giây khi search xong nếu người dùng không tương tác
  useEffect(() => {
    if (!showDropdown) return;
    if (isHoveringDropdown) return;

    const timer = window.setTimeout(() => {
      setShowDropdown(false);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [showDropdown, debouncedQuery, results, isHoveringDropdown]);

  function selectMovie(movie: Movie) {
    navigate(`/movie/${movie.slug || movie.id}`);
  }

  function handleFilterClick(label: string) {
    setActiveFilter(label);
    setInput("");
    setParams({});
  }

  return (
    <main className="min-h-[70vh] px-3.5 sm:px-[4.5%] pb-28 pt-20 sm:pt-24">
      {/* Search Input */}
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          setShowDropdown(false);
          const selected = suggestions[activeSuggestionIndex];
          if (selected) {
            selectMovie(selected);
            return;
          }
          const next = new URLSearchParams();
          if (input.trim()) next.set("q", input.trim());
          setParams(next);
        }}
        className="relative mx-auto mb-6 max-w-2xl"
      >
        <label className="flex h-12 items-center gap-3 border-b-2 border-white/60 px-2 focus-within:border-primary">
          <Search className="size-5 shrink-0 text-white/70" />
          <input
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              setInput(val);
              setActiveSuggestionIndex(-1);
              if (val.trim().length >= 2) {
                setShowDropdown(true);
              } else {
                setShowDropdown(false);
              }
            }}
            onFocus={() => {
              if (input.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length > 0) {
                event.preventDefault();
                setShowDropdown(true);
                setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
              } else if (event.key === "ArrowUp" && suggestions.length > 0) {
                event.preventDefault();
                setShowDropdown(true);
                setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
              } else if (event.key === "Escape") {
                setShowDropdown(false);
                setActiveSuggestionIndex(-1);
              }
            }}
            placeholder="Tìm theo tên phim, diễn viên, từ khóa..."
            aria-label="Tìm phim"
            aria-autocomplete="list"
            aria-expanded={showDropdown && suggestions.length > 0}
            aria-controls="movie-search-suggestions"
            role="combobox"
            className="w-full bg-transparent text-base sm:text-2xl outline-none placeholder:text-white/45"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput("");
                setParams({});
                setActiveSuggestionIndex(-1);
                setShowDropdown(false);
              }}
              className="min-h-9 px-2 text-xs text-white/60 hover:text-white"
            >
              Xóa
            </button>
          )}
        </label>
        {showDropdown && suggestions.length > 0 && (
          <ul
            id="movie-search-suggestions"
            role="listbox"
            aria-label="Gợi ý phim"
            onMouseEnter={() => setIsHoveringDropdown(true)}
            onMouseLeave={() => setIsHoveringDropdown(false)}
            className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#181818] p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {suggestions.map((movie, index) => (
              <li key={movie.id || movie.slug} role="option" aria-selected={index === activeSuggestionIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setShowDropdown(false);
                    selectMovie(movie);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    index === activeSuggestionIndex ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{movie.title}</span>
                    <span className="block truncate text-xs text-white/50">
                      {movie.originalTitle || movie.kind}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-white/50">{movie.year}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Quick Category / Genre Filter Chips */}
      <div className="mx-auto mb-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {QUICK_FILTERS.map((f) => {
          const isSelected = !debouncedQuery && activeFilter === f.label;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => handleFilterClick(f.label)}
              className={cn(
                "rounded-full px-3.5 py-1.5 min-h-[36px] text-xs font-semibold transition-all active:scale-95",
                isSelected
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading && <LoadingSkeleton rows={2} />}
      {error && (
        <RequestError
          message={error instanceof Error ? error.message : "Có lỗi khi tìm phim."}
          onRetry={() => void resultsQuery.refetch()}
        />
      )}
      {telemetryError && (
        <p className="mb-4 text-center text-xs text-amber-300" role="status">
          Không thể đồng bộ lịch sử tìm kiếm: {telemetryError}
        </p>
      )}

      {!loading && !error && debouncedQuery && results.length === 0 && (
        <div className="py-12 text-center">
          <Clapperboard className="mx-auto mb-3 size-12 text-white/30" />
          <p className="text-base font-semibold text-white/80">
            Không tìm thấy phim phù hợp với “{debouncedQuery}”.
          </p>
          <p className="mt-1 text-xs text-white/50">
            Thử kiểm tra lỗi chính tả hoặc tìm với từ khóa chung hơn.
          </p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-base font-bold sm:text-xl">
              {debouncedQuery ? (
                <>
                  <Search className="size-4 text-primary" />
                  Kết quả cho “{debouncedQuery}” ({results.length} phim)
                </>
              ) : (
                <>
                  <Flame className="size-4 text-primary" />
                  {activeFilter} ({results.length} phim)
                </>
              )}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((movie) => (
              <MovieCard key={movie.id || movie.slug} movie={movie} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
