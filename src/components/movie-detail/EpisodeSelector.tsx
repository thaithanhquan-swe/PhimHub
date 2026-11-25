import { CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EpisodeItem, EpisodeServer } from "@/services/movieApi";

interface EpisodeSelectorProps {
  currentServer?: EpisodeServer;
  currentEpisodeIndex: number;
  downloadedEpisodeIndices?: Set<number>;
  downloadingEpisodeIndices?: Set<number>;
  queuedEpisodeIndices?: Set<number>;
  onSelectEpisode: (episodeIndex: number) => void;
  onStartBatchDownload?: () => void;
  onCancelBatchDownload?: () => void;
  isOnline?: boolean;
}

export function EpisodeSelector({
  currentServer,
  currentEpisodeIndex,
  downloadedEpisodeIndices,
  downloadingEpisodeIndices,
  queuedEpisodeIndices,
  onSelectEpisode,
  onStartBatchDownload,
  onCancelBatchDownload,
  isOnline = true,
}: EpisodeSelectorProps) {
  if (!currentServer || !currentServer.items || currentServer.items.length === 0) {
    return null;
  }

  const totalEpisodes = currentServer.items.length;
  const downloadedCount = downloadedEpisodeIndices?.size || 0;
  const isDownloadingCount = downloadingEpisodeIndices?.size || 0;
  const queuedCount = queuedEpisodeIndices?.size || 0;
  const isBatchActive = (isDownloadingCount + queuedCount) > 0;
  const allDownloaded = downloadedCount === totalEpisodes && totalEpisodes > 0;
  const remainingCount = totalEpisodes - downloadedCount;

  return (
    <div className="mt-6 rounded-md border border-white/10 bg-[#1a1a1a] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/90">
            Danh sách tập ({totalEpisodes} tập)
          </h3>
          {allDownloaded && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <CheckCircle2 className="size-3" /> Đã tải trọn bộ
            </span>
          )}
        </div>

        {/* Batch download actions */}
        <div className="flex flex-wrap items-center gap-2">
          {totalEpisodes > 1 && (
            <>
              {isBatchActive ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1">
                  <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Loader2 className="size-3 animate-spin shrink-0" />
                    <span>Đang tải: {downloadedCount}/{totalEpisodes} tập</span>
                  </span>
                  {onCancelBatchDownload && (
                    <button
                      type="button"
                      onClick={onCancelBatchDownload}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 underline underline-offset-2 ml-1 shrink-0"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              ) : remainingCount > 0 && onStartBatchDownload ? (
                <button
                  type="button"
                  onClick={onStartBatchDownload}
                  disabled={!isOnline}
                  className="inline-flex items-center gap-1.5 rounded bg-white/10 hover:bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40 shrink-0"
                  title="Tải toàn bộ các tập còn lại về xem offline"
                >
                  <Download className="size-3 shrink-0" />
                  <span>Tải cả bộ ({remainingCount} tập)</span>
                </button>
              ) : null}
            </>
          )}
          <span className="text-xs text-white/50 truncate max-w-full">{currentServer.server_name}</span>
        </div>
      </div>

      <div className="flex max-h-64 flex-wrap gap-1.5 sm:gap-2 overflow-y-auto pr-1">
        {currentServer.items.map((ep: EpisodeItem, idx: number) => {
          const isActive = idx === currentEpisodeIndex;
          const isDownloaded = downloadedEpisodeIndices?.has(idx);
          const isDownloading = downloadingEpisodeIndices?.has(idx);
          const isQueued = queuedEpisodeIndices?.has(idx);

          return (
            <button
              key={ep.slug || ep.name}
              type="button"
              onClick={() => onSelectEpisode(idx)}
              className={cn(
                "min-w-10 sm:min-w-12 min-h-[38px] rounded px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
              )}
            >
              <span>
                {ep.name.toLowerCase().includes("tập")
                  ? ep.name
                  : ep.name.toLowerCase() === "full"
                    ? "Bản Full"
                    : `Tập ${ep.name}`}
              </span>

              {/* Status indicators */}
              {isDownloaded ? (
                <span
                  className="size-1.5 rounded-full bg-emerald-400 shrink-0"
                  title="Đã tải về máy để xem offline"
                />
              ) : isDownloading ? (
                <span title="Đang tải đoạn video về máy">
                  <Loader2 className="size-2.5 animate-spin text-primary shrink-0" />
                </span>
              ) : isQueued ? (
                <span title="Đang xếp hàng chờ tải">
                  <Clock className="size-2.5 text-amber-400 shrink-0" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
