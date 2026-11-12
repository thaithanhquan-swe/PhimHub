import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Movie } from "@/data/movies";

const STORAGE_KEY = "phimhub-watchlist-v2";

type WatchlistContextValue = {
  movies: Movie[];
  toggle: (movie: Movie) => void;
  clear: () => void;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function readWatchlist(): Movie[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(stored)
      ? stored.filter(
          (item): item is Movie =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "title" in item,
        )
      : [];
  } catch (error) {
    console.warn("Không thể đọc danh sách phim đã lưu:", error);
    return [];
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>(readWatchlist);

  function toggle(movie: Movie) {
    const exists = movies.some((item) => item.id === movie.id);
    const next = exists
      ? movies.filter((item) => item.id !== movie.id)
      : [...movies, movie];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMovies(next);
    } catch (error) {
      console.warn("Không thể lưu danh sách phim:", error);
    }
  }

  function clear() {
    try {
      localStorage.setItem(STORAGE_KEY, "[]");
      setMovies([]);
    } catch (error) {
      console.warn("Không thể xóa danh sách phim đã lưu:", error);
    }
  }

  const value = useMemo(() => ({ movies, toggle, clear }), [movies]);
  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) {
    throw new Error("useWatchlist phải được dùng bên trong WatchlistProvider.");
  }
  return value;
}
