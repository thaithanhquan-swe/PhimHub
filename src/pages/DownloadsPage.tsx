import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Film,
  HardDrive,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  SkipForward,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { formatBytes, type OfflineDownload } from "@/services/offlineStorage";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn } from "@/lib/utils";

interface MovieDownloadGroup {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  posterDataUrl?: string;
  backdropUrl?: string;
  serverName: string;
  totalBytes: number;
  episodes: OfflineDownload[];
}

export function DownloadsPage() {
  const {
    downloads,
    storage,
    isOnline,
    cancelDownload,
    cancelBatchForMovie,
    deleteAllForMovie,
    startDownload,
  } = useOfflineDownloads();

  const [activeDownload, setActiveDownload] = useState<OfflineDownload | null>(null);
  const [expandedMovies, setExpandedMovies] = useState<Record<string, boolean>>({});
  const playerSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Phim Đã Tải (Xem Offline) | PhimHub";
  }, []);

  const completedDownloads = useMemo(
    () => downloads.filter((d) => d.status === "completed"),
    [downloads],
  );

  const inProgressDownloads = useMemo(
    () => downloads.filter((d) => d.status !== "completed"),
    [downloads],
  );

  // Group completed downloads by movieSlug
  const completedGroups = useMemo(() => {
    const map = new Map<string, MovieDownloadGroup>();

    for (const item of completedDownloads) {
      const existing = map.get(item.movieSlug);
      if (existing) {
        existing.totalBytes += item.totalBytes;
        existing.episodes.push(item);
        if (!existing.posterDataUrl && item.posterDataUrl) {
          existing.posterDataUrl = item.posterDataUrl;
        }
      } else {
        map.set(item.movieSlug, {
          movieSlug: item.movieSlug,
          movieTitle: item.movieTitle,
          posterUrl: item.posterUrl,
          posterDataUrl: item.posterDataUrl,
          backdropUrl: item.backdropUrl,
          serverName: item.serverName,
          totalBytes: item.totalBytes,
          episodes: [item],
        });
      }
    }

    const groups = Array.from(map.values());
    for (const group of groups) {
      group.episodes.sort((a, b) => a.episodeIndex - b.episodeIndex);
    }
    return groups;
  }, [completedDownloads]);

  // Group in-progress downloads by movieSlug
  const inProgressGroups = useMemo(() => {
    const map = new Map<string, { movieSlug: string; movieTitle: string; items: OfflineDownload[] }>();
    for (const item of inProgressDownloads) {
      const existing = map.get(item.movieSlug);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.movieSlug, {
          movieSlug: item.movieSlug,
          movieTitle: item.movieTitle,
          items: [item],
        });
      }
    }
    return Array.from(map.values());
  }, [inProgressDownloads]);

  // Toggle accordion expand
  const toggleExpand = (slug: string) => {
    setExpandedMovies((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const handlePlay = (item: OfflineDownload) => {
    setActiveDownload(item);
    setTimeout(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteSingle = async (item: OfflineDownload) => {
    if (window.confirm(`Xóa bản tải "${item.movieTitle} - ${item.episodeName}" khỏi máy?`)) {
      if (activeDownload?.id === item.id) {
        setActiveDownload(null);
      }
      await cancelDownload(item.id);
    }
  };

  const handleDeleteGroup = async (group: MovieDownloadGroup) => {
    if (
      window.confirm(
        `Xóa toàn bộ ${group.episodes.length} tập của phim "${group.movieTitle}" khỏi máy để giải phóng dung lượng?`,
      )
    ) {
      if (activeDownload?.movieSlug === group.movieSlug) {
        setActiveDownload(null);
      }
      await deleteAllForMovie(group.movieSlug);
    }
  };

  const handleCancelGroupBatch = async (movieSlug: string, movieTitle: string, count: number) => {
    if (window.confirm(`Hủy tải ${count} tập đang tải/chờ của phim "${movieTitle}"?`)) {
      await cancelBatchForMovie(movieSlug);
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
      m3u8Url: item.m3u8Url || "",
      quality: item.quality,
    });
  };

  // Find next episode in current active movie group for seamless binge-watching
  const currentMovieCompletedEpisodes = useMemo(() => {
    if (!activeDownload) return [];
    const group = completedGroups.find((g) => g.movieSlug === activeDownload.movieSlug);
    return group ? group.episodes : [];
  }, [activeDownload, completedGroups]);

  const nextEpisodeInSeries = useMemo(() => {
    if (!activeDownload || currentMovieCompletedEpisodes.length <= 1) return null;
    const currentIdx = currentMovieCompletedEpisodes.findIndex((e) => e.id === activeDownload.id);
    if (currentIdx !== -1 && currentIdx < currentMovieCompletedEpisodes.length - 1) {
      return currentMovieCompletedEpisodes[currentIdx + 1];
    }
    return null;
  }, [activeDownload, currentMovieCompletedEpisodes]);

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
            Xem phim mọi lúc mọi nơi ngay cả khi mất mạng hoặc không có Wi-Fi (0 MB 3G/4G).
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
            Các phim đã tải được lưu trực tiếp trên thiết bị này. Bạn có thể mở xem bình thường mà không tiêu tốn 1 KB data nào.
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

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {completedGroups.length} bộ phim ({completedDownloads.length} tập)
            </span>
          </div>
        </div>
      </div>

      {/* Active Offline Video Player */}
      {activeDownload && (
        <section
          ref={playerSectionRef}
          className="mb-10 scroll-mt-24 rounded-2xl border border-primary/40 bg-black/60 p-3 sm:p-5 shadow-2xl backdrop-blur-md"
        >
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
              hasNextEpisode={Boolean(nextEpisodeInSeries)}
              onNextEpisode={() => {
                if (nextEpisodeInSeries) {
                  handlePlay(nextEpisodeInSeries);
                }
              }}
              preferEmbed={false}
            />
          </div>

          {/* Quick episode switch row if this movie has multiple completed episodes */}
          {currentMovieCompletedEpisodes.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <span className="text-xs font-semibold text-white/70 flex items-center gap-1">
                <Layers className="size-3 text-primary" /> Chọn tập xem:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {currentMovieCompletedEpisodes.map((ep) => {
                  const isCurrent = ep.id === activeDownload.id;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handlePlay(ep)}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-semibold transition-all active:scale-95",
                        isCurrent
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
                      )}
                    >
                      {ep.episodeName}
                    </button>
                  );
                })}
              </div>

              {nextEpisodeInSeries && (
                <button
                  type="button"
                  onClick={() => handlePlay(nextEpisodeInSeries)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold transition-all active:scale-95"
                >
                  <span>Tập tiếp ({nextEpisodeInSeries.episodeName})</span>
                  <SkipForward className="size-3" />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* In-Progress Downloads (Grouped by Movie) */}
      {inProgressGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
            Đang tải xuống ({inProgressDownloads.length} tập)
          </h2>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {inProgressGroups.map((group) => {
              const downloading = group.items.find((i) => i.status === "downloading");
              const queued = group.items.filter((i) => i.status === "queued");
              const errors = group.items.filter((i) => i.status === "error");

              return (
                <div
                  key={group.movieSlug}
                  className="flex flex-col gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white truncate">{group.movieTitle}</h3>
                      <p className="text-xs text-white/60">
                        {group.items.length} tập đang xử lý ({queued.length} trong hàng đợi)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelGroupBatch(group.movieSlug, group.movieTitle, group.items.length)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0"
                    >
                      Hủy cả bộ
                    </button>
                  </div>

                  {/* Active downloading episode progress */}
                  {downloading ? (
                    <div className="rounded-lg bg-black/40 p-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/80">
                        <span className="font-semibold text-white truncate">
                          Đang tải: {downloading.episodeName}
                        </span>
                        <span className="font-bold text-primary shrink-0 ml-2">
                          {downloading.progress}% ({downloading.downloadedSegments}/{downloading.totalSegments} đoạn)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${downloading.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/50">
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="size-3 animate-spin" />
                          Đang lưu vào máy
                        </span>
                        <span>{formatBytes(downloading.totalBytes)}</span>
                      </div>
                    </div>
                  ) : queued.length > 0 ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-black/30 p-2.5 text-xs text-amber-300">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Đang chờ lượt tải ({queued[0].episodeName} tiếp theo...)</span>
                    </div>
                  ) : null}

                  {/* Error items retry */}
                  {errors.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-red-300 border-t border-white/5 pt-2">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="size-3.5 text-red-400 shrink-0" />
                        {errors.length} tập gặp lỗi
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetry(errors[0])}
                        disabled={!isOnline}
                        className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200 hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="size-3" /> Thử lại
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Downloads (Grouped by Movie) */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
          Phim đã tải xong ({completedGroups.length} bộ · {completedDownloads.length} tập)
        </h2>

        {completedGroups.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 px-4 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-white/5 text-white/40 mb-4">
              <Download className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chưa có tập phim nào được tải về</h3>
            <p className="max-w-md text-xs sm:text-sm text-white/60 mb-6 leading-relaxed">
              Bạn có thể vào bất kỳ bộ phim nào trên PhimHub và bấm nút{" "}
              <strong className="text-white">"Tải cả bộ"</strong> hoặc{" "}
              <strong className="text-white">"Tải tập này"</strong> để lưu vào máy và xem khi không có Wi-Fi hoặc khi đi tàu xe, máy bay.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
            >
              <Film className="size-4" /> Khám phá phim ngay
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {completedGroups.map((group) => {
              const isExpanded = expandedMovies[group.movieSlug] ?? (group.episodes.length > 1 ? false : true);
              const firstEpisode = group.episodes[0];
              const isPlayingInThisGroup = activeDownload?.movieSlug === group.movieSlug;

              return (
                <div
                  key={group.movieSlug}
                  className={cn(
                    "rounded-2xl border bg-[#18181b] p-3.5 sm:p-4 transition-all shadow-md",
                    isPlayingInThisGroup
                      ? "border-primary/50 ring-1 ring-primary/40 bg-gradient-to-b from-[#1c1c22] to-[#16161a]"
                      : "border-white/10 hover:border-white/20",
                  )}
                >
                  {/* Movie Summary Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Poster thumbnail */}
                      <div className="relative aspect-[2/3] w-16 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-black/40 shadow-sm">
                        <img
                          src={group.posterDataUrl || group.posterUrl}
                          alt={group.movieTitle}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>

                      {/* Movie Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="size-2.5" /> Sẵn sàng offline
                          </span>
                          <span className="text-[11px] text-white/50">
                            {formatBytes(group.totalBytes)}
                          </span>
                        </div>

                        <h3 className="mt-1 font-bold text-base sm:text-lg text-white truncate">
                          {group.movieTitle}
                        </h3>

                        <p className="mt-0.5 text-xs text-white/60">
                          {group.serverName} ·{" "}
                          <span className="font-semibold text-white/90">
                            {group.episodes.length} tập đã tải
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Group Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handlePlay(firstEpisode)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black hover:bg-white/90 px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        <Play className="size-3.5 fill-current" />
                        <span>Xem {group.episodes.length > 1 ? "tập 1" : "ngay"}</span>
                      </button>

                      {group.episodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.movieSlug)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors"
                        >
                          <span>{group.episodes.length} tập</span>
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        title="Xóa toàn bộ các tập của phim này để giải phóng dung lượng"
                        className="grid size-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Episode List / Grid */}
                  {isExpanded && group.episodes.length > 1 && (
                    <div className="mt-4 border-t border-white/10 pt-3.5">
                      <div className="mb-2 text-xs font-semibold text-white/60">
                        Chọn tập để phát hoặc xóa từng tập:
                      </div>
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {group.episodes.map((ep) => {
                          const isEpPlaying = activeDownload?.id === ep.id;
                          return (
                            <div
                              key={ep.id}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-2 text-xs transition-all",
                                isEpPlaying
                                  ? "border-primary bg-primary/20 text-white shadow-sm"
                                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handlePlay(ep)}
                                className="flex-1 text-left min-w-0 pr-1"
                              >
                                <p className="font-bold truncate">{ep.episodeName}</p>
                                <p className="text-[10px] text-white/50">{formatBytes(ep.totalBytes)}</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(ep)}
                                title={`Xóa ${ep.episodeName}`}
                                className="grid size-6 place-items-center rounded text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors shrink-0"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
