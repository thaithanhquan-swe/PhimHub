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
  Smartphone,
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
  preferEmbed = false,
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
  preferEmbed?: boolean;
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
  const [canAdjustVolume, setCanAdjustVolume] = useState(true);
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<"contain" | "cover">("contain");
  const [qualities, setQualities] = useState<QualityOption[]>([{ index: -1, label: "Tự động (Auto)" }]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmbedFallback, setUseEmbedFallback] = useState(preferEmbed);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(false);
  const [isManualFullscreen, setIsManualFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"main" | "speed" | "quality" | "ratio">("main");
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [mutedAutoplayNotice, setMutedAutoplayNotice] = useState(false);

  useEffect(() => {
    setUseEmbedFallback(preferEmbed);
  }, [preferEmbed]);

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
    setMutedAutoplayNotice(false);

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

    // Safety timeout: If stream metadata doesn't load within 8.5s, fall back to embed player
    const timeoutTimer = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && v.readyState === 0 && !isPlaying) {
        console.warn("HLS load timed out after 8.5s, falling back to embed player");
        if (embedUrl) {
          setUseEmbedFallback(true);
        } else {
          setIsLoading(false);
        }
      }
    }, 8500);

    // Prefer Hls.js on all browsers supporting MediaSource Extensions (Chrome, Edge, Firefox, Mac Safari)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Critical: lowLatencyMode is for live streams, disable for VOD to prevent stalling
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 8000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 3,
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
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => {
                // Autoplay blocked by browser policy: attempt muted autoplay
                video.muted = true;
                setIsMuted(true);
                video
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    setMutedAutoplayNotice(true);
                  })
                  .catch(() => {
                    // Completely blocked: stay paused and ready for user click
                    video.muted = false;
                    setIsMuted(false);
                    setIsPlaying(false);
                    setIsLoading(false);
                  });
              });
          }
        }
      });

      let fatalErrorCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          fatalErrorCount++;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (fatalErrorCount <= 2) {
                hls.startLoad();
              } else {
                hls.destroy();
                if (embedUrl) {
                  setUseEmbedFallback(true);
                } else {
                  setError("Không thể kết nối máy chủ phát video. Vui lòng thử lại.");
                  setIsLoading(false);
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (fatalErrorCount <= 2) {
                hls.recoverMediaError();
              } else {
                hls.destroy();
                if (embedUrl) {
                  setUseEmbedFallback(true);
                } else {
                  setError("Định dạng video không tương thích.");
                  setIsLoading(false);
                }
              }
              break;
            default:
              hls.destroy();
              if (embedUrl) {
                setUseEmbedFallback(true);
              } else {
                setError("Luồng video gặp sự cố. Vui lòng thử lại.");
                setIsLoading(false);
              }
              break;
          }
        }
      });

      return () => {
        window.clearTimeout(timeoutTimer);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native iOS Safari path
      video.src = m3u8Url;
      const handleLoadedMeta = () => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => {
              setIsPlaying(true);
              setIsLoading(false);
              setMutedAutoplayNotice(true);
            }).catch(() => {
              video.muted = false;
              setIsMuted(false);
              setIsPlaying(false);
              setIsLoading(false);
            });
          });
        }
      };
      const handleError = () => {
        if (embedUrl) {
          setUseEmbedFallback(true);
        } else {
          setError("Không thể phát video.");
          setIsLoading(false);
        }
      };

      video.addEventListener("loadedmetadata", handleLoadedMeta, { once: true });
      video.addEventListener("error", handleError, { once: true });

      return () => {
        window.clearTimeout(timeoutTimer);
        video.removeEventListener("loadedmetadata", handleLoadedMeta);
        video.removeEventListener("error", handleError);
      };
    } else if (embedUrl) {
      setUseEmbedFallback(true);
    } else {
      setError("Trình duyệt không hỗ trợ phát định dạng video này.");
      setIsLoading(false);
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
    const handlePause = () => {
      setIsPlaying(false);
      setIsLoading(false); // Stop buffering spinner when paused
    };
    const handleWaiting = () => {
      // Only display spinner if video is playing and actively waiting for data
      if (!video.paused) {
        setIsLoading(true);
      }
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedData = () => setIsLoading(false);
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
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("ended", handleEnded);
    };
  }, [hasNextEpisode, onNextEpisode, onTimeUpdate]);

  // Track browser fullscreen without switching to iOS's native video controls.
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Expand the player when a touch device is physically turned to landscape.
  useEffect(() => {
    const updateOrientation = () => {
      const isMobileLandscape =
        window.innerWidth > window.innerHeight &&
        (navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
      setIsDeviceLandscape(isMobileLandscape);
    };
    const handleOrientationChange = () => {
      updateOrientation();
      if (window.innerWidth <= window.innerHeight) {
        setIsManualFullscreen(false);
      }
    };

    updateOrientation();
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", updateOrientation);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", updateOrientation);
    };
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
    const appliedVolume = video.volume;
    const volumeWasApplied = Math.abs(appliedVolume - newVol) < 0.02;
    setCanAdjustVolume(volumeWasApplied);
    setVolume(volumeWasApplied ? newVol : appliedVolume);
    if (!volumeWasApplied) return;
    if (newVol > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }

  function handleVolumeButtonClick() {
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsVolumeSliderOpen((open) => !open);
      return;
    }
    toggleMute();
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

    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      isManualFullscreen
    );

    if (!isCurrentlyFullscreen) {
      if (container.requestFullscreen) {
        container
          .requestFullscreen()
          .then(async () => {
            if (screen.orientation && "lock" in screen.orientation) {
              try {
                await (screen.orientation as unknown as { lock: (mode: string) => Promise<void> })
                  .lock("landscape");
              } catch {
                // Fullscreen still works when orientation locking is unavailable.
              }
            }
          })
          .catch(() => setIsManualFullscreen(true));
      } else {
        setIsManualFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }
      setIsManualFullscreen(false);
      if (screen.orientation && "unlock" in screen.orientation) {
        screen.orientation.unlock();
      }
    }
  }

  // Use native fullscreen/orientation APIs; never rotate iframe controls sideways.
  async function handleRotateScreen() {
    const container = containerRef.current;
    if (!container) return;

    const orientation = screen.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: "landscape") => Promise<void>;
          unlock?: () => void;
        })
      | undefined;

    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    );

    if (isCurrentlyFullscreen || isManualFullscreen) {
      setIsManualFullscreen(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }
      orientation?.unlock?.();
      return;
    }

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        if (orientation?.lock) {
          await orientation.lock("landscape");
        }
        return;
      }
    } catch {
      // Fall back to an upright in-page fullscreen player when the browser denies fullscreen.
    }

    setIsManualFullscreen(true);
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

  // Touch scrub for mobile devices
  const handleTimelineScrubTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration || duration <= 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
    resetHideControlsTimer();
  };

  const handleVideoClick = () => {
    if (!showControls && isPlaying) {
      setShowControls(true);
      resetHideControlsTimer();
      return;
    }
    togglePlay();
  };

  // If using embed iframe (fallback or when m3u8 is absent)
  if (!preferM3U8 && embedUrl) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10 group/embed",
          (isDeviceLandscape || isManualFullscreen) && "player-landscape-mode",
        )}
      >
        {m3u8Url && (
          <button
            type="button"
            onClick={() => setUseEmbedFallback(false)}
            className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg bg-black/85 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md hover:bg-primary transition-all active:scale-95"
          >
            <span>Phát nguồn trực tiếp (HLS)</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleRotateScreen}
          className="absolute left-2 top-2 z-30 grid size-9 place-items-center rounded-full bg-black/70 text-white/90 backdrop-blur-sm hover:bg-black"
          title={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình" : "Xoay ngang màn hình"}
          aria-label={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình" : "Xoay ngang màn hình"}
        >
          <Smartphone className="size-4 rotate-90 text-primary" />
        </button>
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
        (isDeviceLandscape || isManualFullscreen) && "player-landscape-mode",
      )}
    >
      {/* Native HTML5 Video Player */}
      <video
        ref={videoRef}
        playsInline
        poster={poster}
        onClick={handleVideoClick}
        onDoubleClick={toggleFullscreen}
        className={cn(
          "size-full bg-black transition-all",
          aspectRatio === "cover" ? "object-cover" : "object-contain",
        )}
        preload="auto"
      />

      {/* Big Center Play Button when paused and not actively loading */}
      {!isPlaying && !isLoading && !error && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/35 hover:bg-black/50 transition-colors group/play"
          aria-label="Phát video"
        >
          <div className="grid size-16 sm:size-20 place-items-center rounded-full bg-primary/95 text-white shadow-2xl transition-transform duration-200 group-hover/play:scale-110 active:scale-95">
            <Play className="size-8 sm:size-10 fill-current ml-1 text-white" />
          </div>
        </button>
      )}

      {/* Buffering Spinner (Only when actively loading/buffering) */}
      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="size-11 animate-spin text-primary" />
            <span className="text-xs text-white/85 font-medium drop-shadow">Đang tải luồng phim...</span>
          </div>
        </div>
      )}

      {/* Muted Autoplay Indicator Notification */}
      {mutedAutoplayNotice && isPlaying && isMuted && (
        <button
          type="button"
          onClick={() => {
            toggleMute();
            setMutedAutoplayNotice(false);
          }}
          className="absolute top-16 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md hover:bg-primary transition-all active:scale-95 animate-in fade-in"
        >
          <VolumeX className="size-4" />
          <span>Bấm để bật âm thanh 🔊</span>
        </button>
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
          onTouchStart={handleTimelineScrubTouch}
          onTouchMove={handleTimelineScrubTouch}
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
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause className="size-4 sm:size-5 fill-current" /> : <Play className="size-4 sm:size-5 fill-current ml-0.5" />}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => seekBy(-10)}
              className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Lùi 10 giây (←)"
            >
              <RotateCcw className="size-3.5 sm:size-4" />
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => seekBy(10)}
              className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Tua tới 10 giây (→)"
            >
              <RotateCw className="size-3.5 sm:size-4" />
            </button>

            {/* Volume Control with smooth custom slide-out track */}
            <div className="group/vol relative flex items-center">
              <button
                type="button"
                onClick={handleVolumeButtonClick}
                className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors"
                title={window.matchMedia("(pointer: coarse)").matches ? "Điều chỉnh âm lượng" : "Bật/Tắt âm thanh (M)"}
                aria-label={window.matchMedia("(pointer: coarse)").matches ? "Điều chỉnh âm lượng" : "Bật/Tắt âm thanh"}
                aria-expanded={isVolumeSliderOpen}
                aria-controls="mobile-volume-slider"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-4 sm:size-5 text-primary" />
                ) : volume < 0.5 ? (
                  <Volume1 className="size-4 sm:size-5" />
                ) : (
                  <Volume2 className="size-4 sm:size-5" />
                )}
              </button>

              {/* Desktop volume slider */}
              <div className="hidden sm:flex h-9 w-0 items-center overflow-hidden transition-all duration-200 ease-out group-hover/vol:w-20 group-hover/vol:px-1.5">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(event) => changeVolume(Number(event.currentTarget.value))}
                  aria-label="Âm lượng video"
                  title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  className="h-4 w-full cursor-pointer accent-primary"
                  disabled={!canAdjustVolume}
                />
              </div>

              {/* Mobile volume popover */}
              {isVolumeSliderOpen && (
                <div
                  id="mobile-volume-slider"
                  className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-xl border border-white/15 bg-[#181818]/95 p-3 shadow-2xl backdrop-blur-xl sm:hidden"
                >
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Âm lượng</span>
                    <span className="text-white/60">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(event) => changeVolume(Number(event.currentTarget.value))}
                    aria-label="Âm lượng video"
                    className="h-8 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canAdjustVolume}
                  />
                  {canAdjustVolume ? (
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="mt-1 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
                      aria-label={isMuted ? "Bật tiếng" : "Tắt tiếng"}
                    >
                      {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      {isMuted ? "Bật tiếng" : "Tắt tiếng"}
                    </button>
                  ) : (
                    <p className="mt-1 text-[11px] leading-4 text-white/60">
                      iOS không cho trang web chỉnh mức âm lượng. Hãy dùng nút âm lượng của thiết bị.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Time Indicator (Netflix-style tabular mono font) */}
            <div className="ml-1 sm:ml-2 flex items-center font-mono text-[10px] sm:text-xs tabular-nums select-none tracking-tight max-[360px]:hidden">
              <span className="font-semibold text-white/95">{formatTime(currentTime)}</span>
              <span className="mx-0.5 sm:mx-1 text-white/35">/</span>
              <span className="text-white/55">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Next Episode, Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Next Episode Button (if available) */}
            {hasNextEpisode && onNextEpisode && (
              <button
                type="button"
                onClick={onNextEpisode}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
                title="Tập tiếp theo (N)"
              >
                <span className="hidden sm:inline">Tập tiếp</span>
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
                  "grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors",
                  isSettingsOpen && "bg-white/20 text-primary",
                )}
                title="Cài đặt phát video"
              >
                <Settings className="size-4" />
              </button>

              {/* Netflix-style Settings Popover Menu */}
              {isSettingsOpen && (
                <div className="absolute bottom-11 sm:bottom-12 right-0 z-50 w-56 sm:w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-[#181818]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
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

                      {/* Switch to Embed Fallback if available */}
                      {embedUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setUseEmbedFallback(true);
                            setIsSettingsOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors text-white"
                        >
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary" />
                            <span>Đổi sang Player dự phòng</span>
                          </span>
                          <span className="text-[11px] text-white/50">Embed</span>
                        </button>
                      )}
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

            {/* Picture-in-Picture (Hidden on small mobile screens) */}
            <button
              type="button"
              onClick={togglePiP}
              className="hidden sm:grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
              title="Hình trong hình (PiP)"
            >
              <PictureInPicture2 className="size-4" />
            </button>

            {/* Rotate to landscape button (Mobile & touch-friendly) */}
            <button
              type="button"
              onClick={handleRotateScreen}
              className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 active:scale-90 transition-all text-white/90 hover:text-white"
              title={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình" : "Xoay ngang màn hình"}
              aria-label={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình" : "Xoay ngang màn hình"}
            >
              <Smartphone className="size-4 rotate-90 text-primary" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 active:scale-90 transition-all"
              title={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình (F)"}
              aria-label={isFullscreen || isManualFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen || isManualFullscreen
                ? <Minimize className="size-4 sm:size-5" />
                : <Maximize className="size-4 sm:size-5" />}
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
