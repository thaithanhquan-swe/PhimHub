import { Bookmark, BookmarkCheck, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { useWatchlist } from "@/context/WatchlistContext";
import { getPosterUrl, type Movie } from "@/data/movies";

export function MovieCard({ movie }: { movie: Movie }) {
  const { movies, toggle } = useWatchlist();
  const saved = movies.some((item) => item.id === movie.id || item.slug === movie.slug);
  const movieId = movie.slug || movie.id;

  const displayEpisode =
    movie.currentEpisode &&
    !movie.currentEpisode.toLowerCase().includes("full") &&
    movie.currentEpisode !== movie.quality
      ? movie.currentEpisode
      : null;

  return (
    <article className="movie-card group relative flex flex-col select-none">
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#1e1e1e] border border-white/5 transition-colors duration-200 group-hover:border-white/20">
        <Link
          to={`/movie/${movieId}`}
          className="absolute inset-0 block outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Xem chi tiết ${movie.title}`}
        >
          <img
            src={getPosterUrl(movie)}
            alt={`Poster phim ${movie.title}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
              const target = e.currentTarget;
              if (movie.backdropUrl && target.src !== movie.backdropUrl) {
                target.src = movie.backdropUrl;
              }
            }}
            className="size-full object-cover pointer-events-none select-none"
          />

          {/* Ambient subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40" />

          {/* Top Left Quality / Episode Badge */}
          {movie.badge && (
            <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-md">
              {movie.badge}
            </span>
          )}

          {/* Center Play Button on hover (Smooth opacity, no bouncing) */}
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-white shadow-xl">
              <Play className="size-4 fill-current ml-0.5" />
            </span>
          </div>
        </Link>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={() => toggle(movie)}
          aria-label={`${saved ? "Xóa khỏi" : "Thêm vào"} danh sách của tôi: ${movie.title}`}
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-80 transition-all hover:bg-white hover:text-black hover:opacity-100"
        >
          {saved ? <BookmarkCheck className="size-3.5 text-primary" /> : <Bookmark className="size-3.5" />}
        </button>
      </div>

      {/* Always Visible Movie Information (No hover required) */}
      <div className="mt-2 flex flex-col px-0.5">
        <Link
          to={`/movie/${movieId}`}
          className="line-clamp-1 font-semibold text-xs sm:text-[13px] text-white group-hover:text-primary transition-colors"
          title={movie.title}
        >
          {movie.title}
        </Link>

        {movie.originalTitle && movie.originalTitle !== movie.title && (
          <p className="line-clamp-1 text-[11px] text-white/50 mt-0.5" title={movie.originalTitle}>
            {movie.originalTitle}
          </p>
        )}

        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60 font-medium">
          <span>{movie.year}</span>
          <span className="text-white/30">•</span>
          <span className="text-white/80">{movie.quality || "FHD"}</span>
          {movie.language && (
            <>
              <span className="text-white/30">•</span>
              <span>{movie.language}</span>
            </>
          )}
          {displayEpisode && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-primary font-semibold">{displayEpisode}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
