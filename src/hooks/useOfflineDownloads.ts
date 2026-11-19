import { useEffect, useState, useCallback } from "react";
import {
  type OfflineDownload,
  subscribeToDownloads,
  startOfflineDownload,
  pauseOfflineDownload,
  cancelAndDeleteOfflineDownload,
  getStorageQuota,
  generateDownloadId,
  type StartDownloadParams,
} from "@/services/offlineStorage";

export function useOfflineDownloads() {
  const [downloads, setDownloads] = useState<OfflineDownload[]>([]);
  const [storage, setStorage] = useState<{ usedBytes: number; quotaBytes: number; availableBytes: number }>({
    usedBytes: 0,
    quotaBytes: 0,
    availableBytes: 0,
  });
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

  // Update storage quota
  const refreshStorage = useCallback(async () => {
    try {
      const quota = await getStorageQuota();
      setStorage(quota);
    } catch {
      // Ignore
    }
  }, []);

  // Subscribe to downloads changes
  useEffect(() => {
    const unsubscribe = subscribeToDownloads((items) => {
      setDownloads(items);
      void refreshStorage();
    });

    void refreshStorage();

    return () => {
      unsubscribe();
    };
  }, [refreshStorage]);

  const getDownloadForEpisode = useCallback(
    (movieSlug: string, serverIndex: number, episodeIndex: number) => {
      const id = generateDownloadId(movieSlug, serverIndex, episodeIndex);
      return downloads.find((d) => d.id === id);
    },
    [downloads],
  );

  const startDownload = useCallback(async (params: StartDownloadParams) => {
    return startOfflineDownload(params);
  }, []);

  const pauseDownload = useCallback(async (id: string) => {
    return pauseOfflineDownload(id);
  }, []);

  const cancelDownload = useCallback(async (id: string) => {
    return cancelAndDeleteOfflineDownload(id);
  }, []);

  return {
    downloads,
    storage,
    isOnline,
    getDownloadForEpisode,
    startDownload,
    pauseDownload,
    cancelDownload,
    refreshStorage,
  };
}
