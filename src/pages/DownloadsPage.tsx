import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Film,
  HardDrive,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { formatBytes, type OfflineDownload } from "@/services/offlineStorage";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn } from "@/lib/utils";

export function DownloadsPage() {
  const { downloads, storage, isOnline, cancelDownload, startDownload } = useOfflineDownloads();
  const [activeDownload, setActiveDownload] = useState<OfflineDownload | null>(null);
  const playerSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Phim Đã Tải (Xem Offline) | PhimHub";
  }, []);

  const handlePlay = (item: OfflineDownload) => {
    setActiveDownload(item);
    setTimeout(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDelete = async (item: OfflineDownload) => {
    if (window.confirm(`Bạn có chắc muốn xóa bản tải "${item.movieTitle} - ${item.episodeName}" khỏi máy?`)) {
      if (activeDownload?.id === item.id) {
        setActiveDownload(null);
      }
      await cancelDownload(item.id);
    }
  };

  const handleRetry = (item: OfflineDownload) => {
    void startDownload({
      movieId: item.movieId,
      movieSlug: item.movieSlug,
      movieTitle: item.movieTitle,
      posterUrl: item.posterUrl,
      backdropUrl: item.backdropUrl,
      serverName: item.serverName,
      serverIndex: item.serverIndex,
      episodeName: item.episodeName,
      episodeSlug: item.episodeSlug,
      episodeIndex: item.episodeIndex,
      m3u8Url: "", // Will be re-fetched or resumed
      quality: item.quality,
    });
  };

  const completedDownloads = downloads.filter((d) => d.status === "completed");
  const inProgressDownloads = downloads.filter((d) => d.status !== "completed");

  return (
    <main className="min-h-screen pb-28 pt-20 sm:pt-24 px-4 sm:px-[4.5%] max-w-6xl mx-auto">
      {/* Header Breadcrumb & Title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Về trang chủ
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Download className="size-6 text-primary" />
            <span>Phim Đã Tải (Xem Offline)</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-white/60">
            Xem phim mọi lúc mọi nơi ngay cả khi mất mạng hoặc không có Wi-Fi.
          </p>
        </div>

        {/* Network Status Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border",
            isOnline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300",
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="size-3.5 text-emerald-400" />
              <span>Đang có kết nối mạng</span>
            </>
          ) : (
            <>
              <WifiOff className="size-3.5 text-amber-400" />
              <span>Chế độ ngoại tuyến (Không có Wi-Fi)</span>
            </>
          )}
        </div>
      </div>

      {/* Offline Notice Banner */}
      {!isOnline && (
        <div className="mb-6 flex items-start sm:items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 shadow-lg">
          <WifiOff className="size-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
          <div className="flex-1 text-xs sm:text-sm leading-relaxed">
            <span className="font-bold">Bạn đang ngoại tuyến! </span>
            Các phim bạn đã tải lưu trực tiếp trên thiết bị này. Bạn có thể mở xem bình thường mà không cần kết nối mạng.
          </div>
        </div>
      )}

      {/* Storage Meter Bar */}
      <div className="mb-8 rounded-xl border border-white/10 bg-[#161618] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/20 text-primary">
              <HardDrive className="size-4.5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Bộ nhớ thiết bị</p>
              <p className="text-white/60 text-[11px] sm:text-xs">
                PhimHub đã dùng: <span className="font-semibold text-primary">{formatBytes(storage.usedBytes)}</span>
                {storage.availableBytes > 0 && (
                  <> · Bộ nhớ còn trống: <span className="font-semibold text-white">{formatBytes(storage.availableBytes)}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {completedDownloads.length} tập phim sẵn sàng
            </span>
          </div>
        </div>
      </div>

      {/* Active Offline Video Player */}
      {activeDownload && (
        <section ref={playerSectionRef} className="mb-10 scroll-mt-24 rounded-2xl border border-primary/40 bg-black/60 p-3 sm:p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Film className="size-4 text-primary shrink-0" />
              <div className="truncate">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Đang phát: {activeDownload.movieTitle}
                </h2>
                <p className="text-xs text-white/60">
                  {activeDownload.episodeName} · {activeDownload.serverName} · Bản ngoại tuyến ({formatBytes(activeDownload.totalBytes)})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveDownload(null)}
              className="grid size-8 place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Đóng trình phát"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-black">
            <VideoPlayer
              key={activeDownload.id}
              m3u8Url={`offline://${activeDownload.id}`}
              title={activeDownload.movieTitle}
              episodeName={activeDownload.episodeName}
              poster={activeDownload.posterDataUrl || activeDownload.posterUrl}
              autoPlay={true}
              initialTime={0}
              hasNextEpisode={false}
              preferEmbed={false}
            />
          </div>
        </section>
      )}

      {/* In-Progress Downloads */}
      {inProgressDownloads.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            Đang tải xuống ({inProgressDownloads.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgressDownloads.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">{item.movieTitle}</h3>
                    <p className="text-xs text-white/60">
                      {item.episodeName} · {item.serverName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelDownload(item.id)}
                    className="text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    Hủy
                  </button>
                </div>

                {item.status === "downloading" ? (
                  <>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="size-3 animate-spin" />
                        {item.progress}% ({item.downloadedSegments}/{item.totalSegments} đoạn)
                      </span>
                      <span>{formatBytes(item.totalBytes)}</span>
                    </div>
                  </>
                ) : item.status === "error" ? (
                  <div className="flex items-center justify-between text-xs text-red-300">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="size-3.5 text-red-400 shrink-0" />
                      Lỗi tải
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRetry(item)}
                      disabled={!isOnline}
                      className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200 hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" /> Thử lại
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Downloads */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
          Phim đã tải xong ({completedDownloads.length})
        </h2>

        {completedDownloads.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 px-4 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-white/5 text-white/40 mb-4">
              <Download className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chưa có tập phim nào được tải về</h3>
            <p className="max-w-md text-xs sm:text-sm text-white/60 mb-6 leading-relaxed">
              Bạn có thể vào bất kỳ bộ phim nào trên PhimHub và bấm nút{" "}
              <strong className="text-white">"Tải về xem offline"</strong> để lưu vào máy và xem khi không có Wi-Fi hoặc khi đi tàu xe, máy bay.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
            >
              <Film className="size-4" /> Khám phá phim ngay
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedDownloads.map((item) => {
              const isCurrentPlaying = activeDownload?.id === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-[#18181b] p-3 transition-all",
                    isCurrentPlaying
                      ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary"
                      : "border-white/10 hover:border-white/25",
                  )}
                >
                  <div className="flex gap-3">
                    {/* Poster thumbnail */}
                    <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
                      <img
                        src={item.posterDataUrl || item.posterUrl}
                        alt={item.movieTitle}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>

                    {/* Movie Info */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="size-2.5" /> Sẵn sàng offline
                        </span>
                        <h3 className="mt-1 font-bold text-sm text-white line-clamp-2 leading-snug">
                          {item.movieTitle}
                        </h3>
                        <p className="mt-1 text-xs text-white/60">
                          {item.episodeName} · {item.serverName}
                        </p>
                      </div>

                      <div className="text-[11px] text-white/50">
                        <span>Dung lượng: {formatBytes(item.totalBytes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3.5 flex items-center gap-2 border-t border-white/5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handlePlay(item)}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all active:scale-95 shadow-sm",
                        isCurrentPlaying
                          ? "bg-primary text-white"
                          : "bg-white text-black hover:bg-white/90",
                      )}
                    >
                      <Play className="size-3.5 fill-current" />
                      <span>{isCurrentPlaying ? "Đang phát" : "Xem ngay"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Xóa bản tải này để giải phóng bộ nhớ"
                      className="grid size-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
