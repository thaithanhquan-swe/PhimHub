import { useCallback, useRef, useState } from "react";

function getTelemetryUrl(): string {
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "") ?? "";
  return `${baseUrl}/api/telemetry/search-query`;
}

export function useSyncSearch() {
  const pendingQueriesRef = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  const syncSearch = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    if (
      !normalizedQuery ||
      normalizedQuery.length > 200 ||
      pendingQueriesRef.current.has(normalizedQuery)
    ) {
      return;
    }

    pendingQueriesRef.current.add(normalizedQuery);

    try {
      const response = await fetch(getTelemetryUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: normalizedQuery }),
      });

      if (!response.ok) {
        throw new Error(`Đồng bộ lịch sử tìm kiếm thất bại (HTTP ${response.status}).`);
      }

      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đồng bộ lịch sử tìm kiếm.");
    } finally {
      pendingQueriesRef.current.delete(normalizedQuery);
    }
  }, []);

  return { syncSearch, error };
}
