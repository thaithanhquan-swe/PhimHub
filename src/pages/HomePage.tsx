import {
  ChevronLeft,
  ChevronRight,
  Film,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { Hero } from "@/components/Hero";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieCard } from "@/components/MovieCard";
import { MovieFilterBar } from "@/components/MovieFilterBar";
import { MovieRow } from "@/components/MovieRow";
import { RequestError } from "@/components/RequestState";
import { useWatchlist } from "@/context/WatchlistContext";
import { getBackdropUrl } from "@/data/movies";
import { cn } from "@/lib/utils";
import {
  getFilteredCatalog,
  getHomeSections,
  type FilterParams,
} from "@/services/movieApi";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { movies: savedMovies, clear: clearSavedMovies } = useWatchlist();

  const typeParam = searchParams.get("type"); // "tv" | "movie" | "hoat-hinh" | null
  const genreParam = searchParams.get("genre") || "all";
  const countryParam = searchParams.get("country") || "all";
  const yearParam = searchParams.get("year") || "all";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const savedOnly = searchParams.get("list") === "saved";

  // Check if user is in filtered category mode (Phim lẻ, Phim bộ, Hoạt hình or custom filters)
  const isFilterMode = Boolean(
    typeParam ||
      (genreParam && genreParam !== "all") ||
      (countryParam && countryParam !== "all") ||
      (yearParam && yearParam !== "all"),
  );

  const homeQuery = useQuery({
    queryKey: ["home-sections", null],
    queryFn: ({ signal }) => getHomeSections(signal, null),
    enabled: !isFilterMode && !savedOnly,
  });
  const filterParams: FilterParams = {
    type: typeParam || "all",
    genre: genreParam,
    country: countryParam,
    year: yearParam,
    page: pageParam,
  };
  const catalogQuery = useQuery({
    queryKey: [
      "filtered-catalog",
      filterParams.type,
      filterParams.genre,
      filterParams.country,
      filterParams.year,
      filterParams.page,
    ],
    queryFn: ({ signal }) => getFilteredCatalog(filterParams, signal),
    enabled: isFilterMode,
  });
  const sections = homeQuery.data ?? null;
  const catalogResult = catalogQuery.data ?? null;
  const loadingCatalog = catalogQuery.isLoading;
  const activeError = isFilterMode ? catalogQuery.error : homeQuery.error;
  const errorMessage = activeError
    ? activeError instanceof Error
      ? activeError.message
      : "Không thể tải danh sách phim."
    : "";

  const featuredMovies = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections[0]?.movies?.slice(0, 6) || [];
  }, [sections]);

  // Handle filter changes
  function handleFilterChange(newValues: Partial<FilterParams>) {
    const next = new URLSearchParams(searchParams);
    if (newValues.type !== undefined) {
      if (newValues.type === "all") next.delete("type");
      else next.set("type", newValues.type);
    }
    if (newValues.genre !== undefined) {
      if (newValues.genre === "all") next.delete("genre");
      else next.set("genre", newValues.genre);
    }
    if (newValues.country !== undefined) {
      if (newValues.country === "all") next.delete("country");
      else next.set("country", newValues.country);
    }
    if (newValues.year !== undefined) {
      if (newValues.year === "all") next.delete("year");
      else next.set("year", String(newValues.year));
    }
    next.delete("page"); // Reset to page 1 on filter change
    setSearchParams(next);
  }

  function handleFilterReset() {
    const next = new URLSearchParams();
    if (typeParam) next.set("type", typeParam);
    setSearchParams(next);
  }

  function handlePageChange(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const categoryTitle =
    typeParam === "tv"
      ? "Kho Phim Bộ Trọn Bộ & Mới Cập Nhật"
      : typeParam === "movie"
        ? "Kho Phim Lẻ Chiếu Rạp Chọn Lọc"
        : typeParam === "hoat-hinh"
          ? "Kho Hoạt Hình & Anime Tuyển Chọn"
          : "Kho Phim Chọn Lọc";

  useEffect(() => {
    if (isFilterMode) {
      document.title = `${categoryTitle} | PhimHub`;
    } else if (savedOnly) {
      document.title = "Danh sách phim đã lưu | PhimHub";
    } else {
      document.title = "PhimHub — Cả thế giới phim trong tầm tay";
    }
  }, [isFilterMode, categoryTitle, savedOnly]);

  if (!sections && !catalogResult && !activeError && !savedOnly) return <LoadingSkeleton />;

  return (
    <main className="pb-28 lg:pb-16 min-h-screen">
      {/* Hero Banner Carousel (Shown on default Home page ONLY for maximum smoothness & fast category page loads) */}
      {!savedOnly && !isFilterMode && featuredMovies.length > 0 && (
        <>
          <link
            rel="preload"
            as="image"
            href={getBackdropUrl(featuredMovies[0], "w1280")}
            fetchPriority="high"
          />
          <Hero
            movies={featuredMovies}
            onPlay={(movie) => navigate(`/movie/${movie.slug || movie.id}?play=true`)}
          />
        </>
      )}

      {/* Saved Movies View */}
      {savedOnly && (
        <div className="px-4 pt-28 sm:px-[4.5%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold sm:text-3xl text-white">
              Danh sách phim đã lưu ({savedMovies.length})
            </h1>
            {savedMovies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Bạn có chắc muốn xóa toàn bộ danh sách phim đã lưu?")) {
                    clearSavedMovies();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-white"
              >
                <Trash2 className="size-3.5" />
                Xóa tất cả
              </button>
            )}
          </div>
          {savedMovies.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">
              Bạn chưa lưu bộ phim nào. Hãy bấm biểu tượng lưu trên các phim bạn yêu thích!
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {savedMovies.map((movie) => (
                <MovieCard key={movie.id || movie.slug} movie={movie} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Continue Watching Section (Home page) */}
      {!savedOnly && !isFilterMode && (
        <div className="relative z-20 mt-4 sm:mt-6">
          <ContinueWatchingRow />
        </div>
      )}

      {/* Error Notice */}
      {activeError && (
        <div className="pt-10 px-4 sm:px-[4.5%]">
          <RequestError
            message={errorMessage}
            onRetry={() => {
              if (isFilterMode) void catalogQuery.refetch();
              else void homeQuery.refetch();
            }}
          />
        </div>
      )}

      {/* Filtered Catalog Mode (When viewing Phim lẻ, Phim bộ, Hoạt hình or custom filters) */}
      {!savedOnly && isFilterMode && (
        <section className="relative z-20 pt-24 sm:pt-28 px-4 sm:px-[4.5%]">
          <div className="mb-4">
            <h1 className="font-display text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Film className="size-6 text-primary" />
              <span>{categoryTitle}</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Khám phá và lọc phim theo thể loại, quốc gia, năm phát hành.
            </p>
          </div>

          {/* Minimalist Filter Bar: Thể loại ⌵   Quốc gia ⌵   Năm ⌵ */}
          <MovieFilterBar
            values={{
              type: typeParam || "all",
              genre: genreParam,
              country: countryParam,
              year: yearParam,
              page: pageParam,
            }}
            onChange={handleFilterChange}
            onReset={handleFilterReset}
            totalResults={catalogResult?.totalItems}
          />

          {loadingCatalog && <LoadingSkeleton rows={2} />}

          {!loadingCatalog && catalogResult && (
            <>
              {catalogResult.movies.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#181818] p-12 text-center text-white/60">
                  <p className="text-base font-semibold text-white/80">
                    Không tìm thấy phim phù hợp với bộ lọc hiện tại.
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Hãy thử nới lỏng bộ lọc hoặc bấm "Đặt lại" để xem toàn bộ danh mục.
                  </p>
                  <button
                    type="button"
                    onClick={handleFilterReset}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/30"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {catalogResult.movies.map((movie) => (
                    <MovieCard key={movie.id || movie.slug} movie={movie} />
                  ))}
                </div>
              )}

              {/* Modern Pagination Controls */}
              {catalogResult.totalPage > 1 && (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={pageParam <= 1}
                    onClick={() => handlePageChange(pageParam - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 min-h-[40px] text-xs font-semibold text-white transition-all disabled:opacity-30 disabled:pointer-events-none hover:bg-white/15 active:scale-95"
                  >
                    <ChevronLeft className="size-4" />
                    <span className="hidden sm:inline">Trang trước</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, catalogResult.totalPage) },
                      (_, i) => {
                        let pageNum = pageParam - 2 + i;
                        if (pageParam < 3) pageNum = i + 1;
                        if (pageParam > catalogResult.totalPage - 2)
                          pageNum = catalogResult.totalPage - 4 + i;
                        if (pageNum < 1 || pageNum > catalogResult.totalPage) return null;

                        const isCurrent = pageNum === pageParam;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={cn(
                              "grid size-10 place-items-center rounded-lg text-xs font-bold transition-all active:scale-95",
                              isCurrent
                                ? "bg-primary text-white shadow-md shadow-primary/40 scale-105"
                                : "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white border border-white/10",
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      },
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={pageParam >= catalogResult.totalPage}
                    onClick={() => handlePageChange(pageParam + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 min-h-[40px] text-xs font-semibold text-white transition-all disabled:opacity-30 disabled:pointer-events-none hover:bg-white/15 active:scale-95"
                  >
                    <span className="hidden sm:inline">Trang sau</span>
                    <ChevronRight className="size-4" />
                  </button>

                  <span className="ml-2 text-xs text-white/50">
                    Trang {pageParam} / {catalogResult.totalPage}
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Themed Horizontal Rows (Default Home View) */}
      {!savedOnly && !isFilterMode && sections && (
        <div className="relative z-10 -mt-2 sm:-mt-4">
          {sections.map((section) => (
            <MovieRow
              key={section.title}
              title={section.title}
              movies={section.movies}
            />
          ))}
        </div>
      )}
    </main>
  );
}
