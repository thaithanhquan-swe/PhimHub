import { useCallback, useRef, useState } from "react";

const SEARCH_HISTORY_KEY = "phimhub_search_history_v1";

function getTelemetryUrl(): string | null {
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/+$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/api/telemetry/search-query`;
}

function saveLocalSearch(query: string) {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((item) => item.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {
    // Ignore local storage errors
  }
}

export function useSyncSearch() {
  const pendingQueriesRef = useRef<Set<string>>(new Set());
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

    // Luôn lưu vào lịch sử cục bộ trên thiết bị của người dùng
    saveLocalSearch(normalizedQuery);

    const url = getTelemetryUrl();
    // Nếu không cấu hình máy chủ backend riêng, không cần gửi telemetry qua mạng
    if (!url) {
      setError(null);
      return;
    }

    pendingQueriesRef.current.add(normalizedQuery);

    try {
      const response = await fetch(url, {
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
      const message = reason instanceof Error ? reason.message : "Không thể đồng bộ lịch sử tìm kiếm.";
      console.warn("Telemetry search sync skipped:", message);
      setError(null); // Không làm phiền người dùng với lỗi telemetry nền
    } finally {
      pendingQueriesRef.current.delete(normalizedQuery);
    }
  }, []);

  return { syncSearch, error };
}
