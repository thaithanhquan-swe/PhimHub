import { useQuery } from "@tanstack/react-query";

import type { Movie } from "@/data/movies";
import { getImdbMetadata } from "@/lib/imdbRating";

type ImdbRatingState = {
  imdbId?: string;
  rating?: number;
  trailerId?: string;
  status: "loading" | "ready" | "empty" | "error";
};

function normalizedTitle(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function useImdbRating(
  movie: Movie | null,
  enabled = true,
  includeTrailer = false,
): ImdbRatingState {
  const cacheKey = movie
    ? [
        "cinemeta",
        movie.kind === "Series" ? "series" : "movie",
        movie.imdbId || normalizedTitle(movie.originalTitle || movie.title),
        movie.year,
      ]
    : ["cinemeta", "disabled"];
  const query = useQuery({
    queryKey: cacheKey,
    queryFn: () => {
      if (!movie) throw new Error("Cannot load an IMDb rating without a movie.");
      return getImdbMetadata(movie);
    },
    enabled: Boolean(movie && enabled && (movie.imdbRating === undefined || includeTrailer)),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });

  const rating = movie?.imdbRating ?? query.data?.rating;
  return {
    imdbId: query.data?.imdbId || movie?.imdbId,
    rating,
    trailerId: query.data?.trailerId,
    status:
      rating !== undefined
        ? "ready"
        : query.isPending
          ? "loading"
          : query.isError
            ? "error"
            : "empty",
  };
}
