import { useCallback, useEffect, useRef, useState } from "react";

const SYNC_INTERVAL_MS = 15_000;

type WatchProgressPayload = {
  movieId: string;
  movieTitle: string;
  progress: number;
  totalDuration: number;
};

function getTelemetryUrl(path: string): string | null {
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/api/telemetry/${path}`;
}

export function useSyncWatchProgress(movieId: string, movieTitle: string) {
  const lastSentAtRef = useRef(0);
  const throttledUntilRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lastSentAtRef.current = 0;
    setError(null);
  }, [movieId, movieTitle]);

  const sendProgress = useCallback(
    async (progress: number, totalDuration: number) => {
      if (Date.now() < throttledUntilRef.current) return;
      const url = getTelemetryUrl("watch-progress");
      if (!url) return;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            movieId,
            movieTitle,
            progress,
            totalDuration,
          } satisfies WatchProgressPayload),
        });

        if (!response.ok) {
          if (response.status === 429) {
            throttledUntilRef.current = Date.now() + 60_000;
          }
          throw new Error(`Đồng bộ tiến trình thất bại (HTTP ${response.status}).`);
        }

        setError(null);
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Không thể đồng bộ tiến trình xem.";
        console.warn("Watch progress telemetry skipped:", message);
        setError(null);
      }
    },
    [movieId, movieTitle],
  );

  const onTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (
        !movieId ||
        !movieTitle ||
        !Number.isFinite(currentTime) ||
        !Number.isFinite(duration) ||
        currentTime < 0 ||
        duration <= 0 ||
        currentTime > duration
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastSentAtRef.current < SYNC_INTERVAL_MS) return;

      lastSentAtRef.current = now;
      void sendProgress(currentTime, duration);
    },
    [movieId, movieTitle, sendProgress],
  );

  return { onTimeUpdate, error };
}
