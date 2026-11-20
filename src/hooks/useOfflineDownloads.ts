import { useEffect, useState, useCallback } from "react";
import {
  type OfflineDownload,
  subscribeToDownloads,
  startOfflineDownload,
  startBatchOfflineDownload,
  pauseOfflineDownload,
  cancelAndDeleteOfflineDownload,
  cancelBatchDownloads,
  deleteAllDownloadsForMovie,
  getStorageQuota,
  generateDownloadId,
  type StartDownloadParams,
} from "@/services/offlineStorage";

// Shared global in-memory state across all hook instances to prevent desync
let globalDownloads: OfflineDownload[] = [];
let hasInitiallyLoaded = false;
let globalStorage = { usedBytes: 0, quotaBytes: 0, availableBytes: 0 };
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const sub of subscribers) {
    try {
      sub();
    } catch {
      // Ignore subscriber errors
    }
  }
}

let isGlobalSubscribed = false;
function ensureGlobalSubscription() {
  if (isGlobalSubscribed) return;
  isGlobalSubscribed = true;

  subscribeToDownloads((items) => {
    globalDownloads = items;
    hasInitiallyLoaded = true;
    notifySubscribers();
    void syncStorage();
  });

  void syncStorage();
}

async function syncStorage() {
  try {
    const quota = await getStorageQuota();
    globalStorage = quota;
    notifySubscribers();
  } catch {
    // Ignore
  }
}

export function useOfflineDownloads() {
  // Ensure the single global storage listener is running
  if (typeof window !== "undefined") {
    ensureGlobalSubscription();
  }

  const [downloads, setDownloads] = useState<OfflineDownload[]>(globalDownloads);
  const [storage, setStorage] = useState(globalStorage);
  const [isLoading, setIsLoading] = useState(!hasInitiallyLoaded);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Monitor online / offline status
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update storage quota on demand
  const refreshStorage = useCallback(async () => {
    await syncStorage();
  }, []);

  // Subscribe to shared state changes
  useEffect(() => {
    ensureGlobalSubscription();

    function handleChange() {
      setDownloads(globalDownloads);
      setStorage(globalStorage);
      setIsLoading(!hasInitiallyLoaded);
    }

    subscribers.add(handleChange);
    // Sync on mount in case it loaded before listener was added
    handleChange();

    return () => {
      subscribers.delete(handleChange);
    };
  }, []);

  const getDownloadForEpisode = useCallback(
    (movieSlug: string, serverIndex: number, episodeIndex: number) => {
      const id = generateDownloadId(movieSlug, serverIndex, episodeIndex);
      return downloads.find((d) => d.id === id);
    },
    [downloads],
  );

  const getMovieDownloads = useCallback(
    (movieSlug: string) => {
      return downloads.filter((d) => d.movieSlug === movieSlug);
    },
    [downloads],
  );

  const startDownload = useCallback(async (params: StartDownloadParams) => {
    return startOfflineDownload(params);
  }, []);

  const startBatchDownload = useCallback(async (items: StartDownloadParams[]) => {
    return startBatchOfflineDownload(items);
  }, []);

  const pauseDownload = useCallback(async (id: string) => {
    return pauseOfflineDownload(id);
  }, []);

  const cancelDownload = useCallback(async (id: string) => {
    return cancelAndDeleteOfflineDownload(id);
  }, []);

  const cancelBatchForMovie = useCallback(async (movieSlug: string, serverIndex?: number) => {
    return cancelBatchDownloads(movieSlug, serverIndex);
  }, []);

  const deleteAllForMovie = useCallback(async (movieSlug: string) => {
    return deleteAllDownloadsForMovie(movieSlug);
  }, []);

  return {
    downloads,
    storage,
    isLoading,
    isOnline,
    getDownloadForEpisode,
    getMovieDownloads,
    startDownload,
    startBatchDownload,
    pauseDownload,
    cancelDownload,
    cancelBatchForMovie,
    deleteAllForMovie,
    refreshStorage,
  };
}
