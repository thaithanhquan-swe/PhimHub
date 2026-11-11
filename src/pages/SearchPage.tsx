import { Clapperboard, Flame, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieCard } from "@/components/MovieCard";
import { RequestError } from "@/components/RequestState";
import type { Movie } from "@/data/movies";
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
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeFilter, setActiveFilter] = useState<string>("Mới cập nhật");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(input.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    if (debouncedQuery) {
      searchMovies(debouncedQuery, 1, controller.signal)
        .then(setResults)
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : "Có lỗi khi tìm phim.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    } else {
      // Empty search: load by active filter
      const filter = QUICK_FILTERS.find((f) => f.label === activeFilter) || QUICK_FILTERS[0];
      const fetcher =
        filter.type === "cat"
          ? () => getMoviesByCategory(filter.slug, 1, controller.signal)
          : filter.type === "genre"
            ? () => getMoviesByGenre(filter.slug, 1, controller.signal)
            : () => getNewUpdatedMovies(1, controller.signal);

      fetcher()
        .then(setResults)
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : "Có lỗi khi tải danh sách phim.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }

    return () => controller.abort();
  }, [debouncedQuery, activeFilter]);

  function handleFilterClick(label: string) {
    setActiveFilter(label);
    setInput("");
    setParams({});
  }

  return (
    <main className="min-h-[70vh] px-3.5 sm:px-[4.5%] pb-28 pt-20 sm:pt-24">
      {/* Search Input */}
      <label className="mx-auto mb-6 flex h-12 max-w-2xl items-center gap-3 border-b-2 border-white/60 px-2 focus-within:border-primary">
        <Search className="size-5 shrink-0 text-white/70" />
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tìm theo tên phim, diễn viên, từ khóa..."
          className="w-full bg-transparent text-base sm:text-2xl outline-none placeholder:text-white/45"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              setParams({});
            }}
            className="text-xs text-white/60 hover:text-white px-2 py-1 min-h-[36px]"
          >
            Xóa
          </button>
        )}
      </label>

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
      {error && <RequestError message={error} />}

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
