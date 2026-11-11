import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Info,
  Pause,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useWatchlist } from "@/context/WatchlistContext";
import { getBackdropUrl, getPosterUrl, type Movie } from "@/data/movies";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Tất cả", type: null, icon: Sparkles },
  { label: "Phim bộ", type: "tv", icon: Tv },
  { label: "Phim lẻ", type: "movie", icon: Film },
  { label: "Hoạt hình", type: "hoat-hinh", icon: Clapperboard },
  { label: "Lịch chiếu", type: "schedule", icon: Calendar },
  { label: "Đã lưu", type: "saved", icon: Bookmark },
];

export function Hero({
  movies = [],
  movie,
  onPlay,
}: {
  movies?: Movie[];
  movie?: Movie;
  onPlay: (movie: Movie) => void;
}) {
  // Normalize movies list (support both array of movies or single movie)
  const list = movies.length > 0 ? movies : movie ? [movie] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { movies: savedMovies, toggle } = useWatchlist();

  const activeType = searchParams.get("type");
  const isSavedList = searchParams.get("list") === "saved";

  // Continuous auto-play loop (every 5 seconds, not stopped by mouse hover)
  useEffect(() => {
    if (list.length <= 1 || isPaused) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [list.length, isPaused]);

  if (list.length === 0) return null;

  const currentMovie = list[currentIndex] || list[0];
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

  function handleCategoryClick(catType: string | null) {
    if (catType === "saved") {
      navigate("/?list=saved");
    } else if (catType === "schedule") {
      navigate("/schedule");
    } else if (catType === null) {
      navigate("/");
    } else {
      navigate(`/?type=${catType}`);
    }
  }

  return (
    <section
      className="group relative -mt-[66px] flex min-h-[580px] sm:min-h-[680px] lg:min-h-[760px] flex-col justify-end overflow-hidden pb-16 sm:pb-24 pt-28 sm:pt-36 lg:pt-40"
      aria-label="Phim nổi bật"
    >
      {/* Background Slides with smooth crossfade and subtle zoom animation */}
      <div className="absolute inset-0 size-full overflow-hidden">
        {list.map((m, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={m.id || m.slug || idx}
              className={cn(
                "absolute inset-0 size-full transition-all duration-1000 ease-out",
                isActive
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-105 pointer-events-none",
              )}
            >
              <img
                src={getBackdropUrl(m, "w1280")}
                alt={m.title}
                fetchPriority={idx === 0 ? "high" : "low"}
                decoding="async"
                className="size-full object-cover object-[center_20%]"
              />
            </div>
          );
        })}

        {/* Ambient Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/85 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/70 via-transparent to-transparent" />
      </div>

      {/* Floating Category Navigation Buttons right on Hero */}
      <div className="relative z-20 ml-[4.5%] mr-4 mb-4 sm:mb-6 max-w-[700px]">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(({ label, type, icon: Icon }) => {
            const isCatActive =
              type === "saved"
                ? isSavedList
                : type === null
                  ? !activeType && !isSavedList
                  : activeType === type;

            return (
              <button
                key={label}
                type="button"
                onClick={() => handleCategoryClick(type)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 backdrop-blur-md",
                  isCatActive
                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                    : "bg-black/50 text-white/80 hover:bg-black/80 hover:text-white border border-white/10 hover:border-white/30",
                )}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        key={currentMovie.slug || currentMovie.id}
        className="relative z-10 ml-[4.5%] mr-4 max-w-[720px] hero-fade-in"
      >
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
            Phim nổi bật
          </span>
          {currentMovie.quality && (
            <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
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
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-white drop-shadow-lg">
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
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-black shadow-xl transition-all duration-200 hover:scale-105 hover:bg-white/90"
          >
            <Play className="size-4 fill-current text-primary" /> Xem ngay
          </button>

          <Link
            to={`/movie/${movieId}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/20 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/30 hover:scale-105"
          >
            <Info className="size-4" /> Chi tiết phim
          </Link>

          <button
            type="button"
            onClick={() => toggle(currentMovie)}
            aria-label={isSaved ? "Xóa khỏi danh sách" : "Lưu vào danh sách"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-black/40 border border-white/20 px-4 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-black/60 hover:border-white/40"
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

      {/* Navigation Arrow Controls on Left and Right */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Phim trước đó"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid size-11 place-items-center rounded-full bg-black/40 border border-white/15 text-white/80 backdrop-blur-md transition-all duration-200 hover:bg-black/80 hover:scale-110 hover:text-white"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Phim tiếp theo"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid size-11 place-items-center rounded-full bg-black/40 border border-white/15 text-white/80 backdrop-blur-md transition-all duration-200 hover:bg-black/80 hover:scale-110 hover:text-white"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Bottom Controls: Indicators & Thumbnail Quick Preview */}
      {list.length > 1 && (
        <div className="relative z-20 mt-6 sm:mt-8 flex items-center justify-between px-4 sm:px-[4.5%]">
          {/* Slide Indicator Dots with Pause/Play Status */}
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/10">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Tiếp tục tự động chạy" : "Tạm dừng"}
              className="text-white/60 hover:text-white transition-colors mr-1"
              title={isPaused ? "Tiếp tục chạy slide" : "Tạm dừng slide"}
            >
              {isPaused ? <Play className="size-3 fill-current" /> : <Pause className="size-3" />}
            </button>

            {list.map((m, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={m.id || m.slug || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Chuyển đến phim ${idx + 1}: ${m.title}`}
                  className={cn(
                    "relative h-2 rounded-full transition-all duration-300 overflow-hidden",
                    isActive
                      ? "w-8 bg-primary shadow-sm shadow-primary/50"
                      : "w-2.5 bg-white/30 hover:bg-white/60",
                  )}
                />
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
