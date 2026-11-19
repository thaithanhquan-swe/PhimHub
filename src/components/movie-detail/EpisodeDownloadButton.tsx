import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatBytes } from "@/services/offlineStorage";
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
  const { getDownloadForEpisode, startDownload, cancelDownload, isOnline } = useOfflineDownloads();
  const [isStarting, setIsStarting] = useState(false);

  if (!currentServer || !currentEpisode || !currentEpisode.m3u8) {
    return null;
  }

  const download = getDownloadForEpisode(movie.slug, currentServerIndex, currentEpisodeIndex);

  const handleStart = async () => {
    if (!currentEpisode.m3u8) return;
    try {
      setIsStarting(true);
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
      setIsStarting(false);
    }
  };

  const handleDelete = async () => {
    if (!download) return;
    if (window.confirm(`Xóa bản tải ngoại tuyến của "${movie.title} - ${currentEpisode.name}"?`)) {
      if (isPlayingOffline && onToggleOfflinePlayback) {
        onToggleOfflinePlayback(false);
      }
      await cancelDownload(download.id);
    }
  };

  // 1. Downloading status
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

  // 2. Download Completed
  if (download && download.status === "completed") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3 text-xs">
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
              {isPlayingOffline ? "Đang phát Offline (Không tốn Wi-Fi)" : "Phát bản Offline"}
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            title="Xóa bản tải offline để giải phóng dung lượng"
            className="grid size-7 place-items-center rounded bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. Error status
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
            onClick={handleStart}
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

  // 4. Default: Button to Download
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-white/70">
        <HardDrive className="size-4 text-primary shrink-0" />
        <span>Xem khi không có Wi-Fi? Tải tập này về máy.</span>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={isStarting || !isOnline}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0",
          isOnline
            ? "bg-primary/20 hover:bg-primary text-white border border-primary/40 hover:border-transparent"
            : "bg-white/10 text-white/40 cursor-not-allowed",
        )}
        title={isOnline ? "Tải tập phim này về máy để xem ngoại tuyến" : "Cần kết nối mạng để tải"}
      >
        {isStarting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Đang chuẩn bị...</span>
          </>
        ) : (
          <>
            <Download className="size-3.5" />
            <span>Tải về xem offline</span>
          </>
        )}
      </button>
    </div>
  );
}
