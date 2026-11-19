import { cleanHlsPlaylist, isAdSegmentUrl, makeHlsUrlsAbsolute } from "@/lib/adBlockPlaylist";

export interface OfflineDownload {
  id: string; // `${movieSlug}_s${serverIndex}_e${episodeIndex}`
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  posterDataUrl?: string;
  backdropUrl: string;
  serverName: string;
  serverIndex: number;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  quality?: string;
  status: "queued" | "downloading" | "completed" | "paused" | "error";
  progress: number; // 0 - 100
  downloadedSegments: number;
  totalSegments: number;
  totalBytes: number;
  playlistText?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "phimhub_offline_v1";
const DB_VERSION = 1;
const STORE_DOWNLOADS = "downloads";
const STORE_SEGMENTS = "segments";

let dbInstance: IDBDatabase | null = null;

export function openOfflineDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB không được hỗ trợ trên trình duyệt này."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        const downloadStore = db.createObjectStore(STORE_DOWNLOADS, { keyPath: "id" });
        downloadStore.createIndex("movieSlug", "movieSlug", { unique: false });
        downloadStore.createIndex("status", "status", { unique: false });
        downloadStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SEGMENTS)) {
        const segmentStore = db.createObjectStore(STORE_SEGMENTS, { keyPath: "id" });
        segmentStore.createIndex("downloadId", "downloadId", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// -------------------------------------------------------------
// CRUD for Downloads
// -------------------------------------------------------------

export async function getAllOfflineDownloads(): Promise<OfflineDownload[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, "readonly");
    const store = tx.objectStore(STORE_DOWNLOADS);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as OfflineDownload[]) || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineDownload(id: string): Promise<OfflineDownload | undefined> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, "readonly");
    const store = tx.objectStore(STORE_DOWNLOADS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineDownload(item: OfflineDownload): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, "readwrite");
    const store = tx.objectStore(STORE_DOWNLOADS);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeOfflineDownloadRecord(id: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, "readwrite");
    const store = tx.objectStore(STORE_DOWNLOADS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// Segments Storage
// -------------------------------------------------------------

export async function saveOfflineSegment(
  downloadId: string,
  segmentIndex: number,
  data: ArrayBuffer,
): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEGMENTS, "readwrite");
    const store = tx.objectStore(STORE_SEGMENTS);
    const id = `${downloadId}_${segmentIndex}`;
    const request = store.put({ id, downloadId, segmentIndex, data });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineSegment(
  downloadId: string,
  segmentIndex: number,
): Promise<ArrayBuffer | undefined> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEGMENTS, "readonly");
    const store = tx.objectStore(STORE_SEGMENTS);
    const id = `${downloadId}_${segmentIndex}`;
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function hasOfflineSegment(
  downloadId: string,
  segmentIndex: number,
): Promise<boolean> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEGMENTS, "readonly");
    const store = tx.objectStore(STORE_SEGMENTS);
    const id = `${downloadId}_${segmentIndex}`;
    const request = store.count(id);

    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineSegments(downloadId: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SEGMENTS, "readwrite");
    const store = tx.objectStore(STORE_SEGMENTS);
    const index = store.index("downloadId");
    const request = index.openCursor(IDBKeyRange.only(downloadId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStorageQuota(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  availableBytes: number;
}> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      return {
        usedBytes,
        quotaBytes,
        availableBytes: Math.max(0, quotaBytes - usedBytes),
      };
    } catch {
      // Fallback
    }
  }
  return { usedBytes: 0, quotaBytes: 0, availableBytes: 0 };
}

// -------------------------------------------------------------
// Live Subscriptions / Observer
// -------------------------------------------------------------

type DownloadEventListener = (downloads: OfflineDownload[]) => void;
const listeners = new Set<DownloadEventListener>();

export function subscribeToDownloads(listener: DownloadEventListener): () => void {
  listeners.add(listener);
  // Immediately emit current state
  getAllOfflineDownloads()
    .then((items) => listener(items))
    .catch(() => {});

  return () => {
    listeners.delete(listener);
  };
}

async function notifyListeners() {
  try {
    const items = await getAllOfflineDownloads();
    for (const listener of listeners) {
      listener(items);
    }
  } catch {
    // Ignore notify error
  }
}

// -------------------------------------------------------------
// Download Execution Engine
// -------------------------------------------------------------

const activeControllers = new Map<string, AbortController>();

export function isDownloadActive(id: string): boolean {
  return activeControllers.has(id);
}

export function generateDownloadId(movieSlug: string, serverIndex: number, episodeIndex: number): string {
  return `${movieSlug}_s${serverIndex}_e${episodeIndex}`;
}

async function fetchPosterDataUrl(url: string, signal?: AbortSignal): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export interface StartDownloadParams {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  backdropUrl: string;
  serverName: string;
  serverIndex: number;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  m3u8Url: string;
  quality?: string;
}

export async function startOfflineDownload(params: StartDownloadParams): Promise<string> {
  const {
    movieId,
    movieSlug,
    movieTitle,
    posterUrl,
    backdropUrl,
    serverName,
    serverIndex,
    episodeName,
    episodeSlug,
    episodeIndex,
    m3u8Url,
    quality,
  } = params;

  const id = generateDownloadId(movieSlug, serverIndex, episodeIndex);

  if (activeControllers.has(id)) {
    return id; // Already actively downloading
  }

  const controller = new AbortController();
  activeControllers.set(id, controller);

  // Initialize or load existing record
  let existing = await getOfflineDownload(id);
  const now = Date.now();

  const downloadItem: OfflineDownload = existing || {
    id,
    movieId,
    movieSlug,
    movieTitle,
    posterUrl,
    backdropUrl,
    serverName,
    serverIndex,
    episodeName,
    episodeSlug,
    episodeIndex,
    quality,
    status: "downloading",
    progress: 0,
    downloadedSegments: 0,
    totalSegments: 0,
    totalBytes: 0,
    createdAt: now,
    updatedAt: now,
  };

  downloadItem.status = "downloading";
  downloadItem.updatedAt = now;
  downloadItem.error = undefined;
  await saveOfflineDownload(downloadItem);
  void notifyListeners();

  // Run downloading in background
  (async () => {
    try {
      // 1. Fetch poster as data URL for offline display if not present
      if (!downloadItem.posterDataUrl && posterUrl) {
        try {
          downloadItem.posterDataUrl = await fetchPosterDataUrl(posterUrl, controller.signal);
        } catch {
          // Non-fatal
        }
      }

      // 2. Fetch and parse m3u8 playlist
      const playlistRes = await fetch(m3u8Url, { signal: controller.signal });
      if (!playlistRes.ok) {
        throw new Error(`Không thể lấy danh sách phát m3u8 (HTTP ${playlistRes.status})`);
      }
      let rawPlaylistText = await playlistRes.text();
      let targetPlaylistUrl = m3u8Url;

      // Handle multivariant master playlist: select the best variant
      if (rawPlaylistText.includes("#EXT-X-STREAM-INF") && !rawPlaylistText.includes("#EXTINF:")) {
        const lines = rawPlaylistText.split("\n");
        let bestVariantUrl = "";
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("#EXT-X-STREAM-INF")) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith("#")) {
              bestVariantUrl = new URL(nextLine, m3u8Url).href;
              break;
            }
          }
        }
        if (bestVariantUrl) {
          targetPlaylistUrl = bestVariantUrl;
          const subRes = await fetch(bestVariantUrl, { signal: controller.signal });
          if (!subRes.ok) {
            throw new Error(`Không thể lấy luồng video con (HTTP ${subRes.status})`);
          }
          rawPlaylistText = await subRes.text();
        }
      }

      // Clean ads & make URLs absolute
      const cleanedPlaylist = cleanHlsPlaylist(rawPlaylistText);
      const absolutePlaylist = makeHlsUrlsAbsolute(cleanedPlaylist, targetPlaylistUrl);

      // Extract all segment URLs and construct the offline playlist template
      const lines = absolutePlaylist.split("\n");
      const segmentUrls: string[] = [];
      const offlineLines: string[] = [];
      let segmentIdx = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("#")) {
          offlineLines.push(trimmed);
        } else {
          if (!isAdSegmentUrl(trimmed)) {
            segmentUrls.push(trimmed);
            offlineLines.push(`offline-segment://${id}/${segmentIdx}`);
            segmentIdx++;
          }
        }
      }

      if (segmentUrls.length === 0) {
        throw new Error("Không tìm thấy đoạn video nào trong danh sách phát.");
      }

      downloadItem.totalSegments = segmentUrls.length;
      downloadItem.playlistText = offlineLines.join("\n");
      await saveOfflineDownload(downloadItem);
      void notifyListeners();

      // 3. Download segments in parallel (concurrency: 3)
      const CONCURRENCY = 3;
      let currentIndex = 0;
      let downloadedCount = downloadItem.downloadedSegments || 0;
      let totalBytesAccumulated = downloadItem.totalBytes || 0;

      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (currentIndex < segmentUrls.length) {
          if (controller.signal.aborted) return;
          const idx = currentIndex++;
          const segUrl = segmentUrls[idx];

          // Check if already downloaded from previous attempt
          const exists = await hasOfflineSegment(id, idx);
          if (exists) {
            continue;
          }

          // Fetch segment with retry
          let attempts = 0;
          let buffer: ArrayBuffer | null = null;

          while (attempts < 3 && !buffer && !controller.signal.aborted) {
            try {
              const res = await fetch(segUrl, { signal: controller.signal });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              buffer = await res.arrayBuffer();
            } catch (err: any) {
              attempts++;
              if (controller.signal.aborted) return;
              if (attempts >= 3) {
                throw new Error(`Lỗi tải đoạn ${idx + 1}/${segmentUrls.length}: ${err?.message || "Mạng chập chờn"}`);
              }
              await new Promise((r) => setTimeout(r, 600 * attempts));
            }
          }

          if (buffer) {
            await saveOfflineSegment(id, idx, buffer);
            downloadedCount++;
            totalBytesAccumulated += buffer.byteLength;

            downloadItem.downloadedSegments = downloadedCount;
            downloadItem.totalBytes = totalBytesAccumulated;
            downloadItem.progress = Math.min(99, Math.round((downloadedCount / segmentUrls.length) * 100));
            downloadItem.updatedAt = Date.now();

            // Save state periodically
            if (downloadedCount % 3 === 0 || downloadedCount === segmentUrls.length) {
              await saveOfflineDownload(downloadItem);
              void notifyListeners();
            }
          }
        }
      });

      await Promise.all(workers);

      if (controller.signal.aborted) {
        return;
      }

      // Mark completed
      downloadItem.status = "completed";
      downloadItem.progress = 100;
      downloadItem.downloadedSegments = segmentUrls.length;
      downloadItem.updatedAt = Date.now();
      await saveOfflineDownload(downloadItem);
      void notifyListeners();
    } catch (err: any) {
      if (controller.signal.aborted) {
        // Paused or canceled intentionally
        return;
      }
      console.error("Offline download failed:", err);
      downloadItem.status = "error";
      downloadItem.error = err?.message || "Lỗi tải video offline";
      downloadItem.updatedAt = Date.now();
      await saveOfflineDownload(downloadItem);
      void notifyListeners();
    } finally {
      activeControllers.delete(id);
    }
  })();

  return id;
}

export async function pauseOfflineDownload(id: string): Promise<void> {
  const controller = activeControllers.get(id);
  if (controller) {
    controller.abort();
    activeControllers.delete(id);
  }

  const item = await getOfflineDownload(id);
  if (item && item.status === "downloading") {
    item.status = "paused";
    item.updatedAt = Date.now();
    await saveOfflineDownload(item);
    void notifyListeners();
  }
}

export async function cancelAndDeleteOfflineDownload(id: string): Promise<void> {
  const controller = activeControllers.get(id);
  if (controller) {
    controller.abort();
    activeControllers.delete(id);
  }

  await deleteOfflineSegments(id);
  await removeOfflineDownloadRecord(id);
  void notifyListeners();
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${(mb / 1024).toFixed(2)} GB`;
}
