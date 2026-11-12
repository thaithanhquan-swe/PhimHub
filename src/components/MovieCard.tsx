import { Bookmark, BookmarkCheck, ExternalLink, Play, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useWatchlist } from "@/context/WatchlistContext";
import { getPosterUrl, type Movie } from "@/data/movies";
import { useImdbRating } from "@/hooks/useImdbRating";
import { getImdbUrl } from "@/lib/imdb";

export function MovieCard({ movie }: { movie: Movie }) {
  const [shouldLoadImdb, setShouldLoadImdb] = useState(false);
  const { movies, toggle } = useWatchlist();
  const saved = movies.some((item) => item.id === movie.id || item.slug === movie.slug);
  const movieId = movie.slug || movie.id;

  const displayEpisode =
    movie.currentEpisode &&
    !movie.currentEpisode.toLowerCase().includes("full") &&
    movie.currentEpisode !== movie.quality
      ? movie.currentEpisode
      : null;

  const previewDescription =
    movie.description && !movie.description.includes("Chưa có mô tả")
      ? movie.description
      : [
          movie.originalTitle && movie.originalTitle !== movie.title ? movie.originalTitle : "",
          movie.genre,
          movie.year ? `Năm ${movie.year}` : "",
          displayEpisode ? `Tình trạng: ${displayEpisode}` : "",
        ]
          .filter(Boolean)
          .join(" · ") || `${movie.title} - Xem chi tiết trên PhimHub.`;

  return (
    <article className="movie-card group relative flex flex-col select-none">
      {/* Poster Container */}
      <div className="group/poster relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#1e1e1e] border border-white/5 transition-colors duration-200 group-hover:border-white/20">
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
            onLoad={() => setShouldLoadImdb(true)}
            onError={(e) => {
              const target = e.currentTarget;
              setShouldLoadImdb(true);
              if (movie.backdropUrl && target.src !== movie.backdropUrl) {
                target.src = movie.backdropUrl;
              }
            }}
            className="size-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover/poster:scale-105"
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
          <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black via-black/90 to-transparent px-2.5 pb-2.5 pt-8 opacity-0 transition-all duration-200 group-hover/poster:translate-y-0 group-hover/poster:opacity-100 group-focus-within/poster:translate-y-0 group-focus-within/poster:opacity-100">
            <p className="line-clamp-3 text-left text-[10px] leading-4 text-white/85 sm:text-xs">
              {previewDescription}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white">
              <Play className="size-3 fill-current text-primary" /> Xem chi tiết
            </span>
          </div>
        </Link>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(movie);
          }}
          aria-label={`${saved ? "Xóa khỏi" : "Thêm vào"} danh sách của tôi: ${movie.title}`}
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-85 transition-all hover:bg-white hover:text-black hover:opacity-100 active:scale-90 shadow-md backdrop-blur-xs select-none"
        >
          {saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
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

        <div
          className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[10px] font-medium text-white/60 sm:gap-1.5 sm:text-[11px]"
          title={displayEpisode ? `${movie.year} · ${movie.quality || "FHD"} · ${movie.language || ""} · ${displayEpisode}` : undefined}
        >
          <span className="shrink-0">{movie.year}</span>
          <span className="shrink-0 text-white/30">•</span>
          <span className="shrink-0 text-white/80">{movie.quality || "FHD"}</span>
          {movie.language && (
            <>
              <span className="shrink-0 text-white/30">•</span>
              <span className="shrink-0">{movie.language}</span>
            </>
          )}
          {displayEpisode && (
            <>
              <span className="hidden shrink-0 text-white/30 sm:inline">•</span>
              <span className="hidden min-w-0 truncate font-semibold text-primary sm:inline">{displayEpisode}</span>
            </>
          )}
        </div>
        {movie.imdbRating !== undefined || shouldLoadImdb ? (
          <MovieRating movie={movie} />
        ) : (
          <span className="mt-1 w-fit text-[10px] font-semibold text-white/60 sm:text-[11px]">
            {movie.kind}
          </span>
        )}
      </div>
    </article>
  );
}

function MovieRating({ movie }: { movie: Movie }) {
  const imdb = useImdbRating(movie);
  if (imdb.rating === undefined) return null;

  return (
    <a
      href={getImdbUrl({ ...movie, imdbId: imdb.imdbId })}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Xem điểm IMDb của ${movie.title}`}
      title="Mở trang IMDb"
      className="group mt-1 inline-flex w-fit items-center gap-1.5 text-[10px] font-semibold text-amber-300 hover:text-amber-200 sm:text-[11px] transition-colors"
    >
      <span className="rounded bg-[#f5c518] px-1 py-0.5 text-[9px] font-black text-black leading-none shadow-xs">
        IMDb
      </span>
      <span className="inline-flex items-center gap-0.5 font-bold text-white/95">
        <Star className="size-3 fill-[#f5c518] text-[#f5c518]" />
        <span>{imdb.rating.toFixed(1)}/10</span>
      </span>
      <ExternalLink className="size-2.5 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-300" />
    </a>
  );
}
