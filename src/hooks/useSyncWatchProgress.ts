import { useCallback, useEffect, useRef, useState } from "react";

const SYNC_INTERVAL_MS = 15_000;

type WatchProgressPayload = {
  movieId: string;
  movieTitle: string;
  progress: number;
  totalDuration: number;
};

function getTelemetryUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "") ?? "";
  return `${baseUrl}/api/telemetry/${path}`;
}

export function useSyncWatchProgress(movieId: string, movieTitle: string) {
  const lastSentAtRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lastSentAtRef.current = 0;
    setError(null);
  }, [movieId, movieTitle]);

  const sendProgress = useCallback(
    async (progress: number, totalDuration: number) => {
      try {
        const response = await fetch(getTelemetryUrl("watch-progress"), {
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
          throw new Error(`Đồng bộ tiến trình thất bại (HTTP ${response.status}).`);
        }

        setError(null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Không thể đồng bộ tiến trình xem.");
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
