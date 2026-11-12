import { useEffect, useState } from "react";

import type { Movie } from "@/data/movies";
import { getImdbMetadata } from "@/lib/imdbRating";

type ImdbRatingState = {
  imdbId?: string;
  rating?: number;
  status: "loading" | "ready" | "empty" | "error";
};

export function useImdbRating(movie: Movie | null, enabled = true): ImdbRatingState {
  const [state, setState] = useState<ImdbRatingState>({
    imdbId: movie?.imdbId,
    rating: movie?.imdbRating,
    status: movie?.imdbRating !== undefined ? "ready" : "loading",
  });

  useEffect(() => {
    if (!movie) return;
    if (movie.imdbRating !== undefined) {
      setState({ imdbId: movie.imdbId, rating: movie.imdbRating, status: "ready" });
      return;
    }
    if (!enabled) return;

    let active = true;
    setState({ imdbId: movie.imdbId, status: "loading" });

    getImdbMetadata(movie)
      .then((metadata) => {
        if (!active) return;
        setState({
          imdbId: metadata?.imdbId || movie.imdbId,
          rating: metadata?.rating,
          status: metadata?.rating !== undefined ? "ready" : "empty",
        });
      })
      .catch(() => {
        if (active) setState({ imdbId: movie.imdbId, status: "error" });
      });

    return () => {
      active = false;
    };
  }, [enabled, movie?.imdbId, movie?.imdbRating, movie?.kind, movie?.originalTitle, movie?.title, movie?.year]);

  return state;
}
