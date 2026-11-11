import { ArrowLeft, Play, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { MovieRow } from "@/components/MovieRow";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DemoNotice, RequestError } from "@/components/RequestState";
import { getBackdropUrl, getPosterUrl } from "@/data/movies";
import type { MovieDetails } from "@/services/tmdb";
import { getMovieDetails, isTmdbConfigured } from "@/services/tmdb";

export function MovieDetailPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie";
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setMovie(null);
    setError("");
    getMovieDetails(id, controller.signal, mediaType)
      .then(setMovie)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không tải được phim.");
        }
      });
    return () => controller.abort();
  }, [id, mediaType]);

  if (error) return <div className="pt-16"><RequestError message={error} /></div>;
  if (!movie) return <div className="pt-16"><LoadingSkeleton rows={1} /></div>;

  return (
    <main className="pb-16 pt-[62px] lg:pt-[68px]">
      {!isTmdbConfigured && <DemoNotice />}
      <section className="relative min-h-[430px] overflow-hidden sm:min-h-[550px]">
        <img
          src={getBackdropUrl(movie)}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-[#141414]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/20" />
        <div className="relative z-10 flex min-h-[430px] items-end gap-6 px-4 pb-12 sm:min-h-[550px] sm:px-[4.5%] sm:pb-16">
          <img
            src={getPosterUrl(movie, "w342")}
            alt={`Poster phim ${movie.title}`}
            className="hidden w-40 rounded-sm shadow-xl sm:block lg:w-52"
          />
          <div className="max-w-2xl">
            <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="size-4" /> Trang chủ
            </Link>
            <h1 className="font-display text-4xl font-bold sm:text-6xl">{movie.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="inline-flex items-center gap-1 text-white">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                {movie.rating}
              </span>
              <span>{movie.year}</span>
              <span>{movie.runtime}</span>
              {movie.genres.map((genre) => (
                <span key={genre} className="rounded border border-white/30 px-2 py-1 text-xs">
                  {genre}
                </span>
              ))}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              {movie.overview}
            </p>
            {movie.trailer && (
              <a
                href={`https://www.youtube.com/watch?v=${movie.trailer.key}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/80"
              >
                <Play className="size-4 fill-current" /> Xem trailer
              </a>
            )}
          </div>
        </div>
      </section>

      {movie.trailer && (
        <section className="px-4 py-8 sm:px-[4.5%]">
          <h2 className="mb-4 text-xl font-semibold">Trailer: {movie.trailer.name}</h2>
          <div className="aspect-video max-w-4xl overflow-hidden rounded-sm bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${movie.trailer.key}`}
              title={`Trailer ${movie.title}`}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {movie.cast.length > 0 && (
        <section className="px-4 py-6 sm:px-[4.5%]">
          <h2 className="mb-4 text-xl font-semibold">Diễn viên</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {movie.cast.map((person) => (
              <article key={person.id} className="overflow-hidden rounded-sm bg-[#222]">
                {person.profilePath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                    alt={person.name}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[3/4] bg-[#303030]" />
                )}
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{person.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-white/60">{person.character}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {movie.recommendations.length > 0 && (
        <div className="pt-6">
          <MovieRow title="Phim tương tự" movies={movie.recommendations} />
        </div>
      )}
    </main>
  );
}
