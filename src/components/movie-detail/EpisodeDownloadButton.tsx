import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatBytes, type StartDownloadParams } from "@/services/offlineStorage";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { cn } from "@/lib/utils";
import type { MovieDetails, EpisodeItem, EpisodeServer } from "@/services/movieApi";

interface EpisodeDownloadButtonProps {
  movie: MovieDetails;
  currentServer?: EpisodeServer;
  currentServerIndex: number;
  currentEpisode?: EpisodeItem;
  currentEpisodeIndex: number;
  isPlayingOffline?: boolean;
  onToggleOfflinePlayback?: (playOffline: boolean) => void;
}

export function EpisodeDownloadButton({
  movie,
  currentServer,
  currentServerIndex,
  currentEpisode,
  currentEpisodeIndex,
  isPlayingOffline = false,
  onToggleOfflinePlayback,
}: EpisodeDownloadButtonProps) {
  const {
    downloads,
    getDownloadForEpisode,
    startDownload,
    startBatchDownload,
    cancelDownload,
    cancelBatchForMovie,
    isOnline,
  } = useOfflineDownloads();

  const [isStartingSingle, setIsStartingSingle] = useState(false);
  const [isStartingBatch, setIsStartingBatch] = useState(false);

  if (!currentServer || !currentEpisode || !currentEpisode.m3u8) {
    return null;
  }

  const download = getDownloadForEpisode(movie.slug, currentServerIndex, currentEpisodeIndex);

  // Server episodes info
  const serverDownloads = downloads.filter(
    (d) => d.movieSlug === movie.slug && d.serverIndex === currentServerIndex,
  );
  const completedDownloads = serverDownloads.filter((d) => d.status === "completed");
  const activeDownloads = serverDownloads.filter(
    (d) => d.status === "downloading" || d.status === "queued",
  );
  const downloadingItem = serverDownloads.find((d) => d.status === "downloading");
  const isBatchActive = activeDownloads.length > 0;

  const totalEpisodesCount = currentServer.items.length;
  const completedEpisodesCount = completedDownloads.length;
  const remainingEpisodesCount = totalEpisodesCount - completedEpisodesCount;
  const isMultiEpisode = totalEpisodesCount > 1;

  const handleStartSingle = async () => {
    if (!currentEpisode.m3u8) return;
    try {
      setIsStartingSingle(true);
      await startDownload({
        movieId: movie.id,
        movieSlug: movie.slug,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl || "",
        backdropUrl: movie.backdropUrl || "",
        serverName: currentServer.server_name,
        serverIndex: currentServerIndex,
        episodeName: currentEpisode.name,
        episodeSlug: currentEpisode.slug || `ep-${currentEpisodeIndex + 1}`,
        episodeIndex: currentEpisodeIndex,
        m3u8Url: currentEpisode.m3u8,
        quality: movie.quality,
      });
    } finally {
      setIsStartingSingle(false);
    }
  };

  const handleStartBatch = async () => {
    if (!currentServer || !currentServer.items) return;
    try {
      setIsStartingBatch(true);
      const itemsToQueue: StartDownloadParams[] = [];
      const completedSet = new Set(completedDownloads.map((d) => d.episodeIndex));

      currentServer.items.forEach((ep, idx) => {
        if (!completedSet.has(idx) && ep.m3u8) {
          itemsToQueue.push({
            movieId: movie.id,
            movieSlug: movie.slug,
            movieTitle: movie.title,
            posterUrl: movie.posterUrl || "",
            backdropUrl: movie.backdropUrl || "",
            serverName: currentServer.server_name,
            serverIndex: currentServerIndex,
            episodeName: ep.name,
            episodeSlug: ep.slug || `ep-${idx + 1}`,
            episodeIndex: idx,
            m3u8Url: ep.m3u8,
            quality: movie.quality,
          });
        }
      });

      if (itemsToQueue.length > 0) {
        await startBatchDownload(itemsToQueue);
      }
    } finally {
      setIsStartingBatch(false);
    }
  };

  const handleCancelBatch = async () => {
    if (window.confirm(`Hủy tải toàn bộ ${activeDownloads.length} tập đang tải/chờ của phim "${movie.title}"?`)) {
      await cancelBatchForMovie(movie.slug, currentServerIndex);
    }
  };

  const handleDeleteSingle = async () => {
    if (!download) return;
    if (window.confirm(`Xóa bản tải ngoại tuyến của "${movie.title} - ${currentEpisode.name}"?`)) {
      if (isPlayingOffline && onToggleOfflinePlayback) {
        onToggleOfflinePlayback(false);
      }
      await cancelDownload(download.id);
    }
  };

  // ----------------------------------------------------------------------
  // SCENARIO 1: Batch download is in progress for this movie / server
  // ----------------------------------------------------------------------
  if (isBatchActive) {
    const isCurrentActive = download?.status === "downloading";
    const isCurrentQueued = download?.status === "queued";
    const isCurrentDone = download?.status === "completed";

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Loader2 className="size-4 animate-spin shrink-0" />
            <span>
              Đang tải cả bộ phim: {completedEpisodesCount}/{totalEpisodesCount} tập xong
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancelBatch}
            className="text-[11px] font-bold text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0 transition-colors"
          >
            Hủy cả bộ
          </button>
        </div>

        {/* Detailed active downloading episode */}
        {downloadingItem && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-black/30 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-white/80">
              <span className="font-semibold text-white truncate">
                Đang tải: {downloadingItem.episodeName.toLowerCase().includes("tập") ? downloadingItem.episodeName : `Tập ${downloadingItem.episodeName}`}
              </span>
              <span className="font-bold text-primary shrink-0 ml-2">
                {downloadingItem.progress}% ({downloadingItem.downloadedSegments}/{downloadingItem.totalSegments} đoạn)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${downloadingItem.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>Đang lưu vào IndexedDB</span>
              <span>{formatBytes(downloadingItem.totalBytes)}</span>
            </div>
          </div>
        )}

        {/* Status of the currently selected episode if different */}
        <div className="flex items-center justify-between text-[11px] text-white/60 pt-0.5 border-t border-white/10 mt-0.5">
          <div className="flex items-center gap-1.5">
            {isCurrentDone ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="size-3" /> Tập đang xem đã tải xong
              </span>
            ) : isCurrentActive ? (
              <span className="text-primary flex items-center gap-1 font-medium">
                <Loader2 className="size-3 animate-spin" /> Tập đang xem đang được tải về
              </span>
            ) : isCurrentQueued ? (
              <span className="text-amber-300 flex items-center gap-1 font-medium">
                <Clock className="size-3" /> Tập đang xem đang chờ tải
              </span>
            ) : (
              <span>Hàng đợi: {activeDownloads.length} tập đang xử lý</span>
            )}
          </div>

          {isCurrentDone && onToggleOfflinePlayback && (
            <button
              type="button"
              onClick={() => onToggleOfflinePlayback(!isPlayingOffline)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-bold transition-all shadow-sm active:scale-95",
                isPlayingOffline
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-white/15 text-white hover:bg-white/25",
              )}
            >
              {isPlayingOffline ? "Phát offline (0 MB 3G/4G)" : "Đổi sang bản Offline"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // SCENARIO 2: Single downloading item
  // ----------------------------------------------------------------------
  if (download && download.status === "downloading") {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/10 p-2.5 sm:p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Loader2 className="size-4 animate-spin shrink-0" />
            <span>
              Đang tải về xem offline: {download.progress}% ({download.downloadedSegments}/{download.totalSegments} đoạn)
            </span>
          </div>
          <button
            type="button"
            onClick={() => cancelDownload(download.id)}
            className="text-[11px] font-bold text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0"
          >
            Hủy tải
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${download.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>{currentEpisode.name.toLowerCase().includes("tập") ? currentEpisode.name : `Tập ${currentEpisode.name}`}</span>
          <span>{formatBytes(download.totalBytes)}</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // SCENARIO 3: Download Completed for current episode
  // ----------------------------------------------------------------------
  if (download && download.status === "completed") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-300">Đã lưu vào máy (Xem ngoại tuyến)</span>
              <span className="ml-2 text-[11px] text-white/60">({formatBytes(download.totalBytes)})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleOfflinePlayback && (
              <button
                type="button"
                onClick={() => onToggleOfflinePlayback(!isPlayingOffline)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-bold transition-all shadow-sm active:scale-95",
                  isPlayingOffline
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-white/15 text-white hover:bg-white/25",
                )}
              >
                {isPlayingOffline ? "Đang phát từ máy (0 MB 3G/4G)" : "Đổi sang bản Offline"}
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteSingle}
              title="Xóa bản tải offline để giải phóng dung lượng"
              className="grid size-7 place-items-center rounded bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Offer batch download for remaining episodes if series */}
        {isMultiEpisode && remainingEpisodesCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-200/80">
            <span>Còn {remainingEpisodesCount} tập khác chưa tải về máy.</span>
            <button
              type="button"
              onClick={handleStartBatch}
              disabled={isStartingBatch || !isOnline}
              className="inline-flex items-center gap-1 font-bold text-white bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/40 rounded px-2.5 py-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {isStartingBatch ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Layers className="size-3" />
              )}
              <span>Tải cả bộ ({remainingEpisodesCount} tập)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // SCENARIO 4: Error status
  // ----------------------------------------------------------------------
  if (download && download.status === "error") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3 text-xs text-red-200">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="size-4 text-red-400 shrink-0" />
          <span>Lỗi tải: {download.error || "Không thể tải đoạn video"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartSingle}
            disabled={!isOnline}
            className="rounded bg-red-500/20 px-2 py-1 font-semibold text-red-300 hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => cancelDownload(download.id)}
            className="text-[11px] text-white/50 hover:text-white"
          >
            Xóa
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // SCENARIO 5: Default download buttons (Single & Batch)
  // ----------------------------------------------------------------------
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-white/70">
        <HardDrive className="size-4 text-primary shrink-0" />
        <span>Xem khi không có Wi-Fi? Tải về máy để xem không tốn 3G/4G.</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Button to download single episode */}
        <button
          type="button"
          onClick={handleStartSingle}
          disabled={isStartingSingle || !isOnline}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0",
            isOnline
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              : "bg-white/5 text-white/40 cursor-not-allowed",
          )}
          title={isOnline ? "Tải tập phim này về máy để xem ngoại tuyến" : "Cần kết nối mạng để tải"}
        >
          {isStartingSingle ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Đang chuẩn bị...</span>
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              <span>Tải tập này</span>
            </>
          )}
        </button>

        {/* Button to download whole series / remaining episodes */}
        {isMultiEpisode && (
          <button
            type="button"
            onClick={handleStartBatch}
            disabled={isStartingBatch || !isOnline || remainingEpisodesCount === 0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0",
              isOnline && remainingEpisodesCount > 0
                ? "bg-primary text-white hover:bg-primary/90 shadow-primary/25 shadow-md"
                : "bg-white/5 text-white/40 cursor-not-allowed",
            )}
            title={
              isOnline
                ? `Tải toàn bộ ${remainingEpisodesCount} tập còn lại của phim về máy`
                : "Cần kết nối mạng để tải"
            }
          >
            {isStartingBatch ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Đang xếp hàng...</span>
              </>
            ) : (
              <>
                <Layers className="size-3.5" />
                <span>Tải cả bộ ({remainingEpisodesCount} tập)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
