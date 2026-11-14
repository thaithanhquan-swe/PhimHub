import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "phimhub_continue_watching_v1";

export type WatchHistoryItem = {
  movieId: string;
  slug: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  serverName: string;
  serverIndex: number;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  currentTime?: number;
  duration?: number;
  quality?: string;
  language?: string;
  updatedAt: number;
};

type WatchHistoryContextValue = {
  history: WatchHistoryItem[];
  saveProgress: (
    item: Omit<WatchHistoryItem, "updatedAt">,
  ) => void;
  getProgress: (slug: string) => WatchHistoryItem | undefined;
  removeFromHistory: (slug: string) => void;
  clearHistory: () => void;
};

const WatchHistoryContext = createContext<WatchHistoryContextValue | null>(null);

function readHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to read watch history:", err);
    return [];
  }
}

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<WatchHistoryItem[]>(readHistory);

  // Sync back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn("Failed to save watch history:", err);
    }
  }, [history]);

  function saveProgress(item: Omit<WatchHistoryItem, "updatedAt">) {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== item.slug && h.movieId !== item.movieId);
      const newItem: WatchHistoryItem = {
        ...item,
        updatedAt: Date.now(),
      };
      const updated = [newItem, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to save watch history:", err);
      }
      return updated;
    });
  }

  function getProgress(slug: string): WatchHistoryItem | undefined {
    return history.find((h) => h.slug === slug || h.movieId === slug);
  }

  function removeFromHistory(slug: string) {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.slug !== slug && h.movieId !== slug);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  const value = useMemo(
    () => ({
      history,
      saveProgress,
      getProgress,
      removeFromHistory,
      clearHistory,
    }),
    [history],
  );

  return (
    <WatchHistoryContext.Provider value={value}>
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error("useWatchHistory must be used within a WatchHistoryProvider");
  }
  return context;
}
