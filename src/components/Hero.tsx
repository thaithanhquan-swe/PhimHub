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
  const movieId = movie.slug || movie.id;

  return (
    <section className="relative -mt-[62px] flex min-h-[560px] items-end overflow-hidden pb-20 pt-28 sm:-mt-[68px] sm:min-h-[690px] sm:pb-28 lg:min-h-[740px]">
      <img
        src={getBackdropUrl(movie, "w1280")}
        alt={movie.title}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover object-[center_25%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30" />

      <div className="relative z-10 ml-[4.5%] max-w-[660px] pr-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Phim mới nhất
          </span>
          {movie.quality && (
            <span className="rounded-sm bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
              {movie.quality}
            </span>
          )}
        </div>

        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-white drop-shadow-md">
          {movie.title}
        </h1>

        <p className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/80 sm:text-sm">
          <span className="font-bold text-white">{movie.year}</span>
          <span>·</span>
          <span>{movie.language || "Vietsub"}</span>
          <span>·</span>
          <span>{movie.runtime}</span>
          {movie.currentEpisode && (
            <>
              <span>·</span>
              <span className="text-primary font-bold">{movie.currentEpisode}</span>
            </>
          )}
        </p>

        <p className="mt-3 line-clamp-3 max-w-[560px] text-sm leading-6 text-white/90 sm:text-base">
          {movie.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex h-11 items-center gap-2 rounded bg-white px-6 text-sm font-bold text-black transition-transform hover:scale-105 hover:bg-white/90 shadow-lg"
          >
            <Play className="size-4 fill-current text-primary" /> Xem ngay
          </button>
          <Link
            to={`/movie/${movieId}`}
            className="inline-flex h-11 items-center gap-2 rounded bg-white/20 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <Info className="size-4" /> Chi tiết phim
          </Link>
        </div>
      </div>
    </section>
  );
}
