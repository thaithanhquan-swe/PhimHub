import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Film,
  Play,
  Share2,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TrailerBackground } from "@/components/TrailerBackground";
import { getBackdropUrl, getPosterUrl } from "@/data/movies";
import { getImdbUrl } from "@/lib/imdb";
import { cn } from "@/lib/utils";
import type { FranchisePart, MovieDetails } from "@/services/movieApi";

interface MovieHeroBannerProps {
  movie: MovieDetails;
  imdb: {
    rating?: number;
    imdbId?: string;
    trailerId?: string;
  };
  franchiseParts: FranchisePart[];
  hasEpisodes: boolean;
  isSaved: boolean;
  copied: boolean;
  onToggleSave: () => void;
  onScrollToPlayer: () => void;
  onShare: () => void;
}

export function MovieHeroBanner({
  movie,
  imdb,
  franchiseParts,
  hasEpisodes,
  isSaved,
  copied,
  onToggleSave,
  onScrollToPlayer,
  onShare,
}: MovieHeroBannerProps) {
  return (
    <section className="relative min-h-[420px] overflow-hidden sm:min-h-[560px]">
      <TrailerBackground
        backdropUrl={getBackdropUrl(movie)}
        trailerSource={movie.trailerUrl || imdb.trailerId}
        title={movie.title}
        priority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-[#141414]/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-black/30 pointer-events-none" />

      <div className="relative z-10 flex min-h-[460px] items-end gap-6 px-4 pb-10 sm:min-h-[560px] sm:px-[4.5%] sm:pb-14">
        <img
          src={getPosterUrl(movie)}
          alt={`Poster phim ${movie.title}`}
          className="hidden w-44 rounded shadow-2xl sm:block lg:w-56 shrink-0 aspect-[2/3] object-cover"
        />

        <div className="max-w-3xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white sm:text-sm"
          >
            <ArrowLeft className="size-4" /> Quay lại Trang chủ
          </Link>

          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {movie.title}
          </h1>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <p className="mt-1 text-sm font-medium text-white/60 sm:text-lg">
              {movie.originalTitle}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:gap-3 sm:text-sm">
            <span className="rounded bg-primary/90 px-2 py-0.5 font-bold uppercase text-white text-[11px]">
              {movie.quality || "HD"}
            </span>
            <span className="rounded bg-white/15 px-2 py-0.5 text-white text-[11px]">
              {movie.language || "Vietsub"}
            </span>
            <span className="font-semibold text-white">{movie.year}</span>
            <span>·</span>
            <span>{movie.runtime}</span>
            {imdb.rating !== undefined ? (
              <a
                href={getImdbUrl({ ...movie, imdbId: imdb.imdbId })}
                target="_blank"
                rel="noopener noreferrer"
                title="Xem đánh giá trên IMDb"
                className="group inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#f5c518]/60 px-2 py-0.5 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
              >
                <span className="rounded bg-[#f5c518] px-1.5 py-0.5 text-[9px] font-black tracking-tight text-black leading-none shadow-xs">
                  IMDb
                </span>
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-[#f5c518] text-[#f5c518]" />
                  <span className="font-bold text-white">{imdb.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-white/50 font-normal">/10</span>
                </span>
                <ExternalLink className="size-3 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#f5c518]" />
              </a>
            ) : (
              <span className="rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white/80">
                {movie.kind}
              </span>
            )}
            {movie.currentEpisode && (
              <>
                <span>·</span>
                <span className="text-white/90 font-medium">{movie.currentEpisode}</span>
              </>
            )}
          </div>

          {/* Genres & Countries */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {movie.genres.map((genre: string) => (
              <span
                key={genre}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/85"
              >
                {genre}
              </span>
            ))}
            {movie.countries.map((country: string) => (
              <span
                key={country}
                className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/70"
              >
                {country}
              </span>
            ))}
          </div>

          <p className="mt-4 max-w-2xl text-xs leading-5 text-white/80 sm:text-sm sm:leading-6 line-clamp-3 sm:line-clamp-4">
            {movie.overview}
          </p>

          {/* Franchise / Season Switcher (Hero area) */}
          {franchiseParts.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/60 mr-1">Các phần:</span>
              {franchiseParts.map((p) => (
                <Link
                  key={p.slug}
                  to={`/movie/${p.slug}?play=true`}
                  className={cn(
                    "px-3 py-1.5 min-h-[34px] inline-flex items-center rounded text-xs font-semibold border transition-all active:scale-95",
                    p.isCurrent
                      ? "bg-[#c4ea3b] text-black border-[#c4ea3b] font-bold shadow-md shadow-[#c4ea3b]/25"
                      : "bg-[#1f1f23]/90 text-white/90 border-white/20 hover:border-white/60 hover:bg-white/10",
                  )}
                >
                  {p.partLabel}
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {hasEpisodes ? (
              <button
                type="button"
                onClick={onScrollToPlayer}
                className="inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95"
              >
                <Play className="size-4 fill-current text-primary" /> Xem phim ngay
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded bg-white/20 px-4 py-2 text-xs text-white/80">
                <Film className="size-4" /> Đang cập nhật tập
              </span>
            )}

            <button
              type="button"
              onClick={onToggleSave}
              className="inline-flex items-center gap-2 rounded bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 active:scale-95"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="size-4 text-primary" /> Đã lưu
                </>
              ) : (
                <>
                  <Bookmark className="size-4" /> Thêm vào danh sách
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded bg-white/10 px-3.5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/20 active:scale-95"
              title="Chia sẻ liên kết phim"
            >
              <Share2 className="size-4" />
              {copied ? <span className="text-xs text-green-400">Đã chép link!</span> : null}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
