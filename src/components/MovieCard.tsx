import { Bookmark, BookmarkCheck, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { useWatchlist } from "@/context/WatchlistContext";
import { getPosterUrl, type Movie } from "@/data/movies";

export function MovieCard({ movie }: { movie: Movie }) {
  const { movies, toggle } = useWatchlist();
  const saved = movies.some((item) => item.id === movie.id || item.slug === movie.slug);
  const movieId = movie.slug || movie.id;

  return (
    <article className="movie-card group relative aspect-[2/3] overflow-hidden rounded-sm bg-[#222] transition-colors duration-200 hover:ring-1 hover:ring-white/30">
      <Link
        to={`/movie/${movieId}`}
        className="absolute inset-0 block outline-none focus-visible:ring-2 focus-visible:ring-white"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

        {movie.badge && (
          <span className="absolute left-2 top-2 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
            {movie.badge}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <p className="line-clamp-1 text-xs font-bold text-white">{movie.title}</p>
          <p className="text-[10px] text-white/75">
            {movie.year} · {movie.quality || "HD"} {movie.language ? `· ${movie.language}` : ""}
          </p>
          <span className="mt-1 grid size-7 place-items-center rounded-full bg-white text-black shadow">
            <Play className="size-3 fill-current text-primary" />
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(movie)}
        aria-label={`${saved ? "Xóa khỏi" : "Thêm vào"} danh sách của tôi: ${movie.title}`}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-100 transition-colors hover:bg-white hover:text-black sm:opacity-0 sm:group-hover:opacity-100"
      >
        {saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
      </button>
    </article>
  );
}
