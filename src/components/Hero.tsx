import { Info, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { getBackdropUrl, type Movie } from "@/data/movies";

export function Hero({
  movie,
  onPlay,
}: {
  movie: Movie;
  onPlay: () => void;
}) {
  return (
    <section className="relative -mt-[62px] flex min-h-[560px] items-end overflow-hidden pb-20 pt-28 sm:-mt-[68px] sm:min-h-[690px] sm:pb-28 lg:min-h-[740px]">
      <img
        src={getBackdropUrl(movie, "w1280")}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover object-[center_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/20" />
      <div className="relative z-10 ml-[4.5%] max-w-[620px] pr-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/80 sm:text-sm">
          Phim nổi bật
        </p>
        <h1 className="max-w-[600px] font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          {movie.title}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/80 sm:text-sm">
          <span className="font-bold text-white">{movie.year}</span>
          <span>★ {movie.rating}</span>
          <span>{movie.genre}</span>
        </p>
        <p className="mt-3 line-clamp-3 max-w-[560px] text-sm leading-6 text-white/90 sm:text-base">
          {movie.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex h-10 items-center gap-2 rounded bg-white px-5 text-sm font-bold text-black hover:bg-white/80"
          >
            <Play className="size-4 fill-current" /> Phát
          </button>
          <Link
            to={`/movie/${movie.id}?type=${movie.kind === "Series" ? "tv" : "movie"}`}
            className="inline-flex h-10 items-center gap-2 rounded bg-white/25 px-5 text-sm font-bold text-white hover:bg-white/35"
          >
            <Info className="size-4" /> Thông tin khác
          </Link>
        </div>
      </div>
    </section>
  );
}
