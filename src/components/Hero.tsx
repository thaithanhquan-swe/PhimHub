import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useWatchlist } from "@/context/WatchlistContext";
import { getBackdropUrl, getPosterUrl, type Movie } from "@/data/movies";
import { useImdbRating } from "@/hooks/useImdbRating";
import { cn } from "@/lib/utils";

export function Hero({
  movies = [],
  movie,
  onPlay,
}: {
  movies?: Movie[];
  movie?: Movie;
  onPlay: (movie: Movie) => void;
}) {
  const list = movies.length > 0 ? movies : movie ? [movie] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const { movies: savedMovies, toggle } = useWatchlist();
  const currentMovie = list[currentIndex] || list[0] || null;
  const { trailerId } = useImdbRating(currentMovie, true, true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  // Continuous auto-play loop (every 5 seconds, light and steady)
  useEffect(() => {
    if (list.length <= 1 || isPaused) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [list.length, isPaused]);

  if (!currentMovie) return null;

  const movieId = currentMovie.slug || currentMovie.id;
  const isSaved = savedMovies.some(
    (item) => item.id === currentMovie.id || item.slug === currentMovie.slug,
  );

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % list.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    // Don't initiate carousel swipe if user touched any interactive button or link
    if (target.closest("button") || target.closest("a")) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? 0;
    const touchEndY = e.changedTouches[0]?.clientY ?? 0;
    const diffX = touchStartXRef.current - touchEndX;
    const diffY = touchStartYRef.current - touchEndY;

    // Only swipe if horizontal motion is dominant and exceeds 45px
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="group relative -mt-[62px] sm:-mt-[66px] flex min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] flex-col justify-end overflow-hidden pb-12 sm:pb-20 pt-32 sm:pt-36 lg:pt-40"
      aria-label="Phim nổi bật"
    >
      {/* Background Slides with Hardware-accelerated Smooth Opacity Crossfade (No heavy scale/reflow) */}
      <div className="absolute inset-0 size-full overflow-hidden bg-[#121212]">
        {list.map((m, idx) => {
          const isActive = idx === currentIndex;
          const isNext = idx === (currentIndex + 1) % list.length;
          return (
            <div
              key={m.id || m.slug || idx}
              className={cn(
                "absolute inset-0 size-full transition-opacity duration-700 ease-in-out [will-change:opacity] [transform:translateZ(0)]",
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
              )}
            >
              {(isActive || isNext) && (
                <img
                  src={getBackdropUrl(m, "w1280")}
                  alt={m.title}
                  fetchPriority={isActive ? "high" : "auto"}
                  decoding="async"
                  loading={isActive ? "eager" : "lazy"}
                  className="size-full object-cover object-[center_20%]"
                />
              )}
              {isActive && trailerId && !prefersReducedMotion && (
                <iframe
                  key={trailerId}
                  src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerId}&playsinline=1&rel=0`}
                  title={`Trailer ${m.title}`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 size-full border-0 object-cover"
                />
              )}
            </div>
          );
        })}

        {/* Ambient Dark Gradients (Flat & fast composite) */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#121212] via-[#121212]/80 via-45% to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#121212] via-[#121212]/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#121212]/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Main Content Area (persistent DOM node with smooth opacity) */}
      <div className="relative z-20 ml-[4.5%] mr-4 max-w-[720px] transition-opacity duration-300">
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
            Phim nổi bật
          </span>
          {currentMovie.quality && (
            <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
              {currentMovie.quality}
            </span>
          )}
          {currentMovie.currentEpisode && (
            <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90">
              {currentMovie.currentEpisode}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-white drop-shadow-lg transition-all duration-300">
          {currentMovie.title}
        </h1>

        {/* Subtitle / Original Name */}
        {currentMovie.originalTitle && currentMovie.originalTitle !== currentMovie.title && (
          <p className="mt-1 text-sm font-medium text-white/70 sm:text-lg drop-shadow">
            {currentMovie.originalTitle}
          </p>
        )}

        {/* Metadata */}
        <p className="mt-3.5 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/85">
          <span className="font-bold text-white">{currentMovie.year}</span>
          <span>·</span>
          <span>{currentMovie.language || "Vietsub"}</span>
          <span>·</span>
          <span>{currentMovie.runtime}</span>
          {currentMovie.genre && (
            <>
              <span>·</span>
              <span className="rounded-full border border-white/25 px-2 py-0.5 text-[11px] text-white/90">
                {currentMovie.genre}
              </span>
            </>
          )}
        </p>

        {/* Description */}
        <p className="mt-3.5 line-clamp-3 max-w-[620px] text-xs leading-5 sm:text-sm sm:leading-6 text-white/90 drop-shadow">
          {currentMovie.description}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onPlay(currentMovie)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-black shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white/90 active:scale-95 select-none"
          >
            <Play className="size-4 fill-current text-primary" /> Xem ngay
          </button>

          <Link
            to={`/movie/${movieId}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/20 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/30 hover:scale-105 active:scale-95 select-none"
          >
            <Info className="size-4" /> Chi tiết phim
          </Link>

          <button
            type="button"
            onClick={() => toggle(currentMovie)}
            aria-label={isSaved ? "Xóa khỏi danh sách" : "Lưu vào danh sách"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-black/40 border border-white/20 px-4 text-sm font-medium text-white transition-all hover:bg-black/60 hover:border-white/40 active:scale-95 select-none"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="size-4 text-primary" />
                <span className="hidden sm:inline">Đã lưu</span>
              </>
            ) : (
              <>
                <Bookmark className="size-4" />
                <span className="hidden sm:inline">Lưu phim</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Arrow Controls on Left and Right (desktop & tablet) */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Phim trước đó"
            className="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 z-20 size-11 place-items-center rounded-full bg-black/40 border border-white/15 text-white/80 transition-all duration-200 hover:bg-black/80 hover:scale-110 hover:text-white active:scale-95"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Phim tiếp theo"
            className="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 z-20 size-11 place-items-center rounded-full bg-black/40 border border-white/15 text-white/80 transition-all duration-200 hover:bg-black/80 hover:scale-110 hover:text-white active:scale-95"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Bottom Controls: Indicators & Thumbnail Quick Preview */}
      {list.length > 1 && (
        <div className="relative z-20 mt-6 sm:mt-8 flex items-center justify-between px-4 sm:px-[4.5%]">
          {/* Slide Indicator Dots with Pause/Play Status */}
          <div className="flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Tiếp tục tự động chạy" : "Tạm dừng"}
              className="grid size-8 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
              title={isPaused ? "Tiếp tục chạy slide" : "Tạm dừng slide"}
            >
              {isPaused ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5" />}
            </button>

            {list.map((m, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={m.id || m.slug || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Chuyển đến phim ${idx + 1}: ${m.title}`}
                  className="group relative flex h-8 items-center px-1.5 active:scale-95 transition-transform"
                >
                  <span
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 block",
                      isActive
                        ? "w-7 sm:w-8 bg-primary shadow-sm shadow-primary/50"
                        : "w-2.5 bg-white/35 group-hover:bg-white/70",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Desktop Quick-Select Preview Thumbnails */}
          <div className="hidden lg:flex items-center gap-2.5">
            {list.slice(0, 5).map((m, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={m.id || m.slug || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "group/thumb relative h-14 w-24 overflow-hidden rounded-md border transition-all duration-300 text-left",
                    isActive
                      ? "border-primary ring-2 ring-primary/40 scale-105 shadow-lg"
                      : "border-white/20 opacity-60 hover:opacity-100 hover:border-white/50",
                  )}
                >
                  <img
                    src={getPosterUrl(m)}
                    alt={m.title}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-1 flex items-end">
                    <p className="line-clamp-1 text-[10px] font-bold text-white">{m.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
