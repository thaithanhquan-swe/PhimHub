import { describe, it, expect, vi } from "vitest";
import { formatBytes, generateDownloadId } from "@/services/offlineStorage";
import { PlaylistAdBlockLoader } from "@/lib/adBlockPlaylist";
import * as offlineStorage from "@/services/offlineStorage";

describe("Offline Storage & Utilities", () => {
  it("generates correct download IDs based on slug and indices", () => {
    const id = generateDownloadId("breaking-bad", 0, 4);
    expect(id).toBe("breaking-bad_s0_e4");

    const id2 = generateDownloadId("one-piece", 1, 100);
    expect(id2).toBe("one-piece_s1_e100");
  });

  it("correctly formats byte sizes to MB and GB", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(-100)).toBe("0 MB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50.0 MB");
    expect(formatBytes(150.5 * 1024 * 1024)).toBe("150.5 MB");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
    expect(formatBytes(12.75 * 1024 * 1024 * 1024)).toBe("12.75 GB");
  });

  it("loads offline playlist and passes valid Hls LoaderStats with loading.start", async () => {
    vi.spyOn(offlineStorage, "getOfflineDownload").mockResolvedValue({
      id: "test-slug_s0_e0",
      movieId: "123",
      movieSlug: "test-slug",
      movieTitle: "Test Movie",
      posterUrl: "https://example.com/poster.jpg",
      backdropUrl: "https://example.com/backdrop.jpg",
      serverName: "Server 1",
      serverIndex: 0,
      episodeName: "Tập 1",
      episodeSlug: "tap-1",
      episodeIndex: 0,
      status: "completed",
      progress: 100,
      downloadedSegments: 1,
      totalSegments: 1,
      totalBytes: 5000,
      playlistText: "#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:10.0,\noffline-segment://test-slug_s0_e0/0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const loader = new (PlaylistAdBlockLoader as any)({} as any);
    const context = { url: "offline://test-slug_s0_e0", responseType: "text" };

    const result = await new Promise<{ response: any; stats: any }>((resolve, reject) => {
      loader.load(context as any, {} as any, {
        onSuccess: (response: any, stats: any) => resolve({ response, stats }),
        onError: (err: any) => reject(err),
        onTimeout: () => reject(new Error("timeout")),
      });
    });

    expect(result.response.data).toContain("#EXT-X-ENDLIST");
    expect(result.response.data).toContain("#EXT-X-PLAYLIST-TYPE:VOD");
    expect(result.stats).toBeDefined();
    expect(result.stats.loading).toBeDefined();
    expect(result.stats.loading.start).toBeGreaterThan(0);
    expect(result.stats.loading.end).toBeGreaterThan(0);
  });

  it("loads offline fragment and returns ArrayBuffer with valid Hls LoaderStats", async () => {
    const fakeBuffer = new Uint8Array([0x47, 0x40, 0x00, 0x10, 0x00]).buffer;
    vi.spyOn(offlineStorage, "getOfflineSegment").mockResolvedValue(fakeBuffer);

    const loader = new (PlaylistAdBlockLoader as any)({} as any);
    const context = { url: "offline-segment://test-slug_s0_e0/0", responseType: "arraybuffer" };

    const result = await new Promise<{ response: any; stats: any }>((resolve, reject) => {
      loader.load(context as any, {} as any, {
        onSuccess: (response: any, stats: any) => resolve({ response, stats }),
        onError: (err: any) => reject(err),
        onTimeout: () => reject(new Error("timeout")),
      });
    });

    expect(result.response.data).toBeInstanceOf(ArrayBuffer);
    expect((result.response.data as ArrayBuffer).byteLength).toBe(5);
    expect(result.stats.loading).toBeDefined();
    expect(result.stats.loading.start).toBeGreaterThan(0);
    expect(result.stats.loaded).toBe(5);
  });

  it("enqueues batch items and skips already completed items", async () => {
    const existingCompleted: offlineStorage.OfflineDownload = {
      id: "batch-test_s0_e0",
      movieId: "1",
      movieSlug: "batch-test",
      movieTitle: "Batch Movie",
      posterUrl: "",
      backdropUrl: "",
      serverName: "S1",
      serverIndex: 0,
      episodeName: "Tập 1",
      episodeSlug: "tap-1",
      episodeIndex: 0,
      status: "completed",
      progress: 100,
      downloadedSegments: 1,
      totalSegments: 1,
      totalBytes: 100,
      createdAt: 0,
      updatedAt: 0,
    };

    const downloadMap = new Map<string, offlineStorage.OfflineDownload>();
    downloadMap.set(existingCompleted.id, existingCompleted);

    const mockDb = {
      transaction: () => ({
        objectStore: () => ({
          get: (id: string) => {
            const req: any = { result: downloadMap.get(id) };
            setTimeout(() => req.onsuccess?.({ target: req }), 0);
            return req;
          },
          getAll: () => {
            const req: any = { result: Array.from(downloadMap.values()) };
            setTimeout(() => req.onsuccess?.({ target: req }), 0);
            return req;
          },
          put: (item: offlineStorage.OfflineDownload) => {
            downloadMap.set(item.id, { ...item });
            const req: any = { result: item.id };
            setTimeout(() => req.onsuccess?.({ target: req }), 0);
            return req;
          },
        }),
      }),
    } as unknown as IDBDatabase;

    offlineStorage.setOfflineDbInstance(mockDb);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("#EXTM3U\n#EXT-X-ENDLIST", { status: 200 }),
    );

    const queuedIds = await offlineStorage.startBatchOfflineDownload([
      {
        movieId: "1",
        movieSlug: "batch-test",
        movieTitle: "Batch Movie",
        posterUrl: "",
        backdropUrl: "",
        serverName: "S1",
        serverIndex: 0,
        episodeName: "Tập 1",
        episodeSlug: "tap-1",
        episodeIndex: 0,
        m3u8Url: "https://example.com/ep1.m3u8",
      },
      {
        movieId: "1",
        movieSlug: "batch-test",
        movieTitle: "Batch Movie",
        posterUrl: "",
        backdropUrl: "",
        serverName: "S1",
        serverIndex: 0,
        episodeName: "Tập 2",
        episodeSlug: "tap-2",
        episodeIndex: 1,
        m3u8Url: "https://example.com/ep2.m3u8",
      },
    ]);

    expect(queuedIds).toEqual(["batch-test_s0_e1"]);
    fetchSpy.mockRestore();
    offlineStorage.setOfflineDbInstance(null);
  });

  it("cancels batch downloads and removes in-progress records while preserving completed ones", async () => {
    const downloadMap = new Map<string, offlineStorage.OfflineDownload>();
    downloadMap.set("cancel-test_s0_e0", {
      id: "cancel-test_s0_e0",
      movieId: "2",
      movieSlug: "cancel-test",
      movieTitle: "Cancel Movie",
      posterUrl: "",
      backdropUrl: "",
      serverName: "S1",
      serverIndex: 0,
      episodeName: "Tập 1",
      episodeSlug: "tap-1",
      episodeIndex: 0,
      status: "queued",
      progress: 0,
      downloadedSegments: 0,
      totalSegments: 0,
      totalBytes: 0,
      createdAt: 0,
      updatedAt: 0,
    });
    downloadMap.set("cancel-test_s0_e1", {
      id: "cancel-test_s0_e1",
      movieId: "2",
      movieSlug: "cancel-test",
      movieTitle: "Cancel Movie",
      posterUrl: "",
      backdropUrl: "",
      serverName: "S1",
      serverIndex: 0,
      episodeName: "Tập 2",
      episodeSlug: "tap-2",
      episodeIndex: 1,
      status: "completed",
      progress: 100,
      downloadedSegments: 1,
      totalSegments: 1,
      totalBytes: 100,
      createdAt: 0,
      updatedAt: 0,
    });

    const deletedRecords: string[] = [];
    const mockDb = {
      transaction: () => ({
        objectStore: (name: string) => {
          if (name === "downloads") {
            return {
              get: (id: string) => {
                const req: any = { result: downloadMap.get(id) };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
              getAll: () => {
                const req: any = { result: Array.from(downloadMap.values()) };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
              put: (item: offlineStorage.OfflineDownload) => {
                downloadMap.set(item.id, { ...item });
                const req: any = { result: item.id };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
              delete: (id: string) => {
                deletedRecords.push(id);
                downloadMap.delete(id);
                const req: any = {};
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
            };
          }
          return {
            index: () => ({
              openCursor: () => {
                const req: any = { result: null };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
            }),
          };
        },
      }),
    } as unknown as IDBDatabase;

    offlineStorage.setOfflineDbInstance(mockDb);

    await offlineStorage.cancelBatchDownloads("cancel-test", 0);

    expect(deletedRecords).toContain("cancel-test_s0_e0");
    expect(deletedRecords).not.toContain("cancel-test_s0_e1");
    offlineStorage.setOfflineDbInstance(null);
  });
});
