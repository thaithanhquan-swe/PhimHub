import { Bookmark, BookmarkCheck, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { getPosterUrl, type Movie } from "@/data/movies";
import { useWatchlist } from "@/context/WatchlistContext";

export function MovieCard({ movie }: { movie: Movie }) {
  const { movies, toggle } = useWatchlist();
  const saved = movies.some((item) => item.id === movie.id);
  return (
    <article className="movie-card group relative aspect-[2/3] overflow-hidden rounded-sm bg-[#252525]">
      <Link
        to={`/movie/${movie.id}?type=${movie.kind === "Series" ? "tv" : "movie"}`}
        className="absolute inset-0 block outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`Xem chi tiết ${movie.title}`}
      >
        <img
          src={getPosterUrl(movie)}
          alt={`Poster phim ${movie.title}`}
          loading="lazy"
          decoding="async"
          className="poster-image size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-90" />
        {movie.badge && (
          <span className="absolute left-2 top-2 rounded-sm bg-primary px-1.5 py-1 text-[9px] font-bold uppercase">
            {movie.badge}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 flex-col gap-1 p-2.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <p className="line-clamp-1 text-xs font-bold">{movie.title}</p>
          <p className="text-[10px] text-white/75">
            {movie.year} · ★ {movie.rating}
          </p>
          <span className="mt-1 grid size-7 place-items-center rounded-full bg-white text-black">
            <Play className="size-3 fill-current" />
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(movie)}
        aria-label={`${saved ? "Xóa khỏi" : "Thêm vào"} danh sách của tôi: ${movie.title}`}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-100 transition-colors hover:bg-white hover:text-black sm:opacity-0 sm:group-hover:opacity-100"
      >
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      </button>
    </article>
  );
}
