import Hls from "hls.js";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Scaling,
  Settings,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

type QualityOption = {
  index: number; // -1 for auto
  label: string;
  height?: number;
};

export function VideoPlayer({
  m3u8Url,
  embedUrl,
  title,
  episodeName,
  poster,
  autoPlay = true,
  hasNextEpisode = false,
  onNextEpisode,
  onTimeUpdate,
}: {
  m3u8Url?: string;
  embedUrl?: string;
  title: string;
  episodeName?: string;
  poster?: string;
  autoPlay?: boolean;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const seekOverlayTimerRef = useRef<number | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<"contain" | "cover">("contain");
  const [qualities, setQualities] = useState<QualityOption[]>([{ index: -1, label: "Tự động (Auto)" }]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"main" | "speed" | "quality" | "ratio">("main");
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  // Timeline hover state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const preferM3U8 = Boolean(m3u8Url && !useEmbedFallback);

  // Auto-hide controls timer
  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isSettingsOpen) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, [isPlaying, isSettingsOpen]);

  // Flash seek feedback (+10s, -10s)
  const triggerSeekFeedback = (text: string) => {
    setSeekFeedback(text);
    if (seekOverlayTimerRef.current) {
      window.clearTimeout(seekOverlayTimerRef.current);
    }
    seekOverlayTimerRef.current = window.setTimeout(() => {
      setSeekFeedback(null);
    }, 600);
  };

  // Setup video source & HLS
  useEffect(() => {
    setError(null);
    setIsLoading(true);

    if (!preferM3U8 || !m3u8Url) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Native Safari / iOS HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8Url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        if (autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
      });
      return;
    }

    // HLS.js for Chrome, Firefox, Edge, Android
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        setDuration(video.duration || 0);

        // Parse available quality levels
        if (data.levels && data.levels.length > 0) {
          const parsedQualities: QualityOption[] = [
            { index: -1, label: "Tự động (Auto)" },
            ...data.levels.map((lvl, idx) => ({
              index: idx,
              label: lvl.height ? `${lvl.height}p ${lvl.height >= 1080 ? "FHD" : lvl.height >= 720 ? "HD" : ""}` : `Chất lượng ${idx + 1}`,
              height: lvl.height,
            })),
          ];
          setQualities(parsedQualities);
        }

        if (autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (embedUrl) {
                setUseEmbedFallback(true);
              } else {
                setError("Luồng video gặp sự cố. Vui lòng thử lại.");
              }
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (embedUrl) {
      setUseEmbedFallback(true);
    } else {
      setError("Trình duyệt không hỗ trợ phát định dạng video này.");
    }
  }, [m3u8Url, preferM3U8, autoPlay, embedUrl]);

  // Video time, buffer, and countdown listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      onTimeUpdate?.(video.currentTime, video.duration || 0);

      // Buffered calculation
      if (video.buffered.length > 0) {
        for (let i = video.buffered.length - 1; i >= 0; i--) {
          if (video.buffered.start(i) <= video.currentTime) {
            setBufferedEnd(video.buffered.end(i));
            break;
          }
        }
      }

      // Next Episode countdown in the last 25s
      const remaining = video.duration - video.currentTime;
      if (hasNextEpisode && remaining > 0 && remaining <= 25) {
        setAutoNextCountdown(Math.ceil(remaining));
      } else {
        setAutoNextCountdown(null);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (hasNextEpisode && onNextEpisode) {
        onNextEpisode();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
    };
  }, [hasNextEpisode, onNextEpisode, onTimeUpdate]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts (Netflix Standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekBy(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekBy(10);
          break;
        case "arrowup":
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case "arrowdown":
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case "n":
          if (hasNextEpisode && onNextEpisode) {
            e.preventDefault();
            onNextEpisode();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, hasNextEpisode, onNextEpisode]);

  // Actions
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideControlsTimer();
  }

  function seekBy(deltaSeconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
    video.currentTime = target;
    triggerSeekFeedback(deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`);
    resetHideControlsTimer();
  }

  function handleTimelineScrub(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
    resetHideControlsTimer();
  }

  function handleTimelineHover(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverPosition(pos * 100);
  }

  function changeVolume(newVol: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function setSpeed(speed: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setIsSettingsOpen(false);
    resetHideControlsTimer();
  }

  function setQuality(levelIndex: number) {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQualityIndex(levelIndex);
    }
    setIsSettingsOpen(false);
    resetHideControlsTimer();
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  async function togglePiP() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP error:", e);
    }
  }

  // If using embed iframe (fallback or when m3u8 is absent)
  if (!preferM3U8 && embedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10">
        <iframe
          key={embedUrl}
          src={embedUrl}
          title={title}
          className="size-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideControlsTimer}
      onMouseLeave={() => {
        if (isPlaying && !isSettingsOpen) setShowControls(false);
      }}
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10 select-none",
        !showControls && isPlaying && "cursor-none",
      )}
    >
      {/* Native HTML5 Video Player */}
      <video
        ref={videoRef}
        playsInline
        poster={poster}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className={cn(
          "size-full bg-black transition-all",
          aspectRatio === "cover" ? "object-cover" : "object-contain",
        )}
        preload="auto"
      />

      {/* Buffering Spinner */}
      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
          <Loader2 className="size-12 animate-spin text-primary" />
        </div>
      )}

      {/* Seek Feedback Animation (+10s, -10s) */}
      {seekFeedback && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-1 rounded-full bg-black/80 px-5 py-2.5 text-lg font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            {seekFeedback.startsWith("+") ? <RotateCw className="size-5" /> : <RotateCcw className="size-5" />}
            <span>{seekFeedback}</span>
          </div>
        </div>
      )}

      {/* Top Bar: Title & Episode */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent p-4 sm:p-6 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0",
        )}
      >
        <div>
          <h2 className="font-display text-sm sm:text-base font-bold text-white line-clamp-1 drop-shadow-md">
            {title}
          </h2>
          {episodeName && (
            <p className="text-xs text-white/70 font-medium mt-0.5">
              {episodeName.toLowerCase().includes("tập") ? episodeName : `Tập ${episodeName}`}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Bar: Netflix-style Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 sm:px-5 pb-3 sm:pb-4 pt-12 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        {/* Interactive Scrub Timeline Bar */}
        <div
          onClick={handleTimelineScrub}
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setHoverTime(null)}
          className="group/timeline relative mb-3.5 flex h-4 w-full cursor-pointer items-center"
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPosition}%` }}
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-md border border-white/10"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Background Track */}
          <div className="relative h-1 w-full rounded-full bg-white/20 transition-all group-hover/timeline:h-2">
            {/* Buffered Bar */}
            <div
              style={{ width: `${Math.min(100, bufferPercent)}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            />
            {/* Played Progress Bar */}
            <div
              style={{ width: `${Math.min(100, progressPercent)}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
            />
            {/* Scrubber Thumb */}
            <div
              style={{ left: `${Math.min(100, progressPercent)}%` }}
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg ring-2 ring-white opacity-0 transition-opacity group-hover/timeline:opacity-100"
            />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls: Play, 10s back, 10s forward, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => seekBy(-10)}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Lùi 10 giây (←)"
            >
              <RotateCcw className="size-4" />
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => seekBy(10)}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Tua tới 10 giây (→)"
            >
              <RotateCw className="size-4" />
            </button>

            {/* Volume Control with smooth custom slide-out track */}
            <div className="group/vol flex items-center">
              <button
                type="button"
                onClick={toggleMute}
                className="grid size-9 place-items-center rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors"
                title="Bật/Tắt âm thanh (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-5 text-primary" />
                ) : volume < 0.5 ? (
                  <Volume1 className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>

              {/* Slider with overflow-hidden so thumb never leaks onto speaker icon */}
              <div className="flex h-9 w-0 items-center overflow-hidden transition-all duration-200 ease-out group-hover/vol:w-20 group-hover/vol:px-1.5">
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    changeVolume(pos);
                  }}
                  className="group/track relative flex h-4 w-full cursor-pointer items-center"
                  title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                >
                  <div className="relative h-1 w-full rounded-full bg-white/25 transition-all group-hover/track:h-1.5">
                    <div
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                    />
                    <div
                      style={{ left: `${(isMuted ? 0 : volume) * 100}%` }}
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover/vol:opacity-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Indicator (Netflix-style tabular mono font) */}
            <div className="ml-2 flex items-center font-mono text-xs tabular-nums select-none tracking-tight">
              <span className="font-semibold text-white/95">{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/35">/</span>
              <span className="text-white/55">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Next Episode, Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Next Episode Button (if available) */}
            {hasNextEpisode && onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
                title="Tập tiếp theo (N)"
              >
                <span>Tập tiếp</span>
                <SkipForward className="size-3.5 fill-current" />
              </button>
            )}

            {/* Settings Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen((prev) => !prev);
                  setActiveSettingsTab("main");
                }}
                className={cn(
                  "grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors",
                  isSettingsOpen && "bg-white/20 text-primary",
                )}
                title="Cài đặt phát video"
              >
                <Settings className="size-4" />
              </button>

              {/* Netflix-style Settings Popover Menu */}
              {isSettingsOpen && (
                <div className="absolute bottom-12 right-0 z-50 w-64 rounded-xl border border-white/15 bg-[#181818]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  {/* Settings Main Tab */}
                  {activeSettingsTab === "main" && (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
                        Cài đặt phát video
                      </div>

                      {/* Speed item */}
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab("speed")}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Gauge className="size-4 text-white/70" />
                          <span>Tốc độ phát</span>
                        </span>
                        <span className="flex items-center gap-1 text-white/60">
                          <span>{playbackSpeed}x</span>
                          <ChevronRight className="size-3.5" />
                        </span>
                      </button>

                      {/* Quality item */}
                      {qualities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setActiveSettingsTab("quality")}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <SlidersIcon className="size-4 text-white/70" />
                            <span>Chất lượng</span>
                          </span>
                          <span className="flex items-center gap-1 text-white/60">
                            <span>
                              {qualities.find((q) => q.index === currentQualityIndex)?.label.split(" ")[0] || "Tự động"}
                            </span>
                            <ChevronRight className="size-3.5" />
                          </span>
                        </button>
                      )}

                      {/* Ratio item */}
                      <button
                        type="button"
                        onClick={() => {
                          setAspectRatio((prev) => (prev === "contain" ? "cover" : "contain"));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Scaling className="size-4 text-white/70" />
                          <span>Tỷ lệ khung hình</span>
                        </span>
                        <span className="text-white/60">
                          {aspectRatio === "cover" ? "Phóng to (Cover)" : "Mặc định (16:9)"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Settings Speed Subtab */}
                  {activeSettingsTab === "speed" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab("main")}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white border-b border-white/10 mb-1"
                      >
                        <ChevronRight className="size-3.5 rotate-180" />
                        <span>Tốc độ phát</span>
                      </button>
                      {PLAYBACK_SPEEDS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeed(s)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                            playbackSpeed === s ? "bg-primary text-white" : "hover:bg-white/10 text-white/80",
                          )}
                        >
                          <span>{s === 1.0 ? "1.0x (Chuẩn)" : `${s}x`}</span>
                          {playbackSpeed === s && <Check className="size-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Settings Quality Subtab */}
                  {activeSettingsTab === "quality" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab("main")}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white border-b border-white/10 mb-1"
                      >
                        <ChevronRight className="size-3.5 rotate-180" />
                        <span>Chất lượng video</span>
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.index}
                          type="button"
                          onClick={() => setQuality(q.index)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                            currentQualityIndex === q.index ? "bg-primary text-white" : "hover:bg-white/10 text-white/80",
                          )}
                        >
                          <span>{q.label}</span>
                          {currentQualityIndex === q.index && <Check className="size-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Picture-in-Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Hình trong hình (PiP)"
            >
              <PictureInPicture2 className="size-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors"
              title="Toàn màn hình (F)"
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Netflix-style "Next Episode" Prompt in last 25s */}
      {autoNextCountdown !== null && hasNextEpisode && onNextEpisode && (
        <div className="absolute bottom-20 right-4 z-30 flex items-center gap-3 rounded-xl border border-white/20 bg-black/85 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300">
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tập tiếp theo</p>
            <p className="text-xs font-bold text-white">Chuyển sau {autoNextCountdown}s...</p>
          </div>
          <button
            type="button"
            onClick={onNextEpisode}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <span>Xem ngay</span>
            <SkipForward className="size-3.5 fill-current" />
          </button>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
          <AlertCircle className="mb-2 size-10 text-primary" />
          <p className="text-sm font-semibold text-white">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              <span>Thử lại</span>
            </button>
            {embedUrl && (
              <button
                type="button"
                onClick={() => setUseEmbedFallback(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                <span>Máy chủ dự phòng</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper
function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
