import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { AUTO_QUALITY, type QualityOption } from "@/components/player";
import {
  createCleanNativeM3u8Url,
  PlaylistAdBlockLoader,
} from "@/lib/adBlockPlaylist";

interface UseHlsPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  m3u8Url?: string;
  embedUrl?: string;
  preferM3U8: boolean;
  autoPlay?: boolean;
  initialTime?: number;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onFallbackToEmbed: () => void;
  onSetMuted: (muted: boolean) => void;
}

export function useHlsPlayer({
  videoRef,
  m3u8Url,
  embedUrl,
  preferM3U8,
  autoPlay = true,
  initialTime = 0,
  hasNextEpisode = false,
  onNextEpisode,
  onTimeUpdate,
  onFallbackToEmbed,
  onSetMuted,
}: UseHlsPlayerOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const initialSeekAppliedRef = useRef(false);

  // Keep latest callbacks in refs to prevent unnecessary re-initialization
  const onFallbackToEmbedRef = useRef(onFallbackToEmbed);
  onFallbackToEmbedRef.current = onFallbackToEmbed;
  const onSetMutedRef = useRef(onSetMuted);
  onSetMutedRef.current = onSetMuted;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onNextEpisodeRef = useRef(onNextEpisode);
  onNextEpisodeRef.current = onNextEpisode;
  const initialTimeRef = useRef(initialTime);
  initialTimeRef.current = initialTime;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<QualityOption[]>([AUTO_QUALITY]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [mutedAutoplayNotice, setMutedAutoplayNotice] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Initial resume seek (stable callback so changing initialTime never tears down Hls)
  const seekToInitialTime = useCallback((video: HTMLVideoElement) => {
    const targetInitial = initialTimeRef.current;
    if (targetInitial <= 0 || initialSeekAppliedRef.current) return;
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    const targetTime = dur > 0 ? Math.min(targetInitial, Math.max(0, dur - 1)) : targetInitial;
    try {
      video.currentTime = targetTime;
      initialSeekAppliedRef.current = true;
      setCurrentTime(targetTime);
    } catch (err) {
      console.warn("Could not resume video at saved position:", err);
    }
  }, []);

  // Resume seek if initialTime changes after metadata loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialTime <= 0 || initialSeekAppliedRef.current) return;
    if (video.readyState >= 1) {
      seekToInitialTime(video);
    }
  }, [initialTime, seekToInitialTime, videoRef]);

  // Setup video source & HLS
  useEffect(() => {
    setError(null);
    setIsLoading(true);
    setMutedAutoplayNotice(false);
    setQualities([AUTO_QUALITY]);
    setCurrentQualityIndex(-1);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setAutoNextCountdown(null);
    initialSeekAppliedRef.current = false;

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

    let fallbackTriggered = false;
    let timeoutTimer: number | null = null;
    let nativeAbortController: AbortController | null = null;

    const fallbackOrShowError = (message: string) => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      if (timeoutTimer !== null) {
        window.clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (nativeAbortController) {
        nativeAbortController.abort();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (embedUrl && !m3u8Url.startsWith("offline://")) {
        onFallbackToEmbedRef.current();
      } else {
        setError(message);
        setIsLoading(false);
      }
    };

    if (!m3u8Url.startsWith("offline://")) {
      timeoutTimer = window.setTimeout(() => {
        const v = videoRef.current;
        const hasLoadedFrames = Boolean(v && v.readyState >= 2);

        if (v && !hasLoadedFrames && isLoadingRef.current) {
          console.warn("HLS load timed out after 12s, falling back to embed player");
          fallbackOrShowError("Luồng phim phản hồi quá chậm. Vui lòng thử lại hoặc đổi máy chủ khác.");
        }
      }, 12000);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.1,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.1,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 8000,
        levelLoadingMaxRetry: 2,
        fragLoadingTimeOut: 10000,
        fragLoadingMaxRetry: 4,
        appendErrorMaxRetry: 4,
        startLevel: -1,
        pLoader: PlaylistAdBlockLoader as any,
        fLoader: PlaylistAdBlockLoader as any,
        loader: PlaylistAdBlockLoader as any,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        seekToInitialTime(video);

        const sortedLevels = data.levels
          .map((level, index) => ({ index, height: level.height, bitrate: level.bitrate }))
          .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || b.bitrate - a.bitrate);
        const seenHeights = new Set<number>();
        const availableQualities = sortedLevels
          .filter(({ height }) => {
            if (!height) return true;
            if (seenHeights.has(height)) return false;
            seenHeights.add(height);
            return true;
          })
          .map(({ index, height }) => ({
            index,
            label: height
              ? `${height}p${height >= 1080 ? " FHD" : height >= 720 ? " HD" : ""}`
              : `Chất lượng ${index + 1}`,
            height,
          }));

        setQualities([AUTO_QUALITY, ...availableQualities]);

        if (autoPlayRef.current) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => {
                video.muted = true;
                onSetMutedRef.current(true);
                video
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    setMutedAutoplayNotice(true);
                  })
                  .catch(() => {
                    video.muted = false;
                    onSetMutedRef.current(false);
                    setIsPlaying(false);
                    setIsLoading(false);
                  });
              });
          }
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
        if (data?.details) {
          const frags = data.details.fragments || [];
          if (!data.details.live && frags.length === 0) {
            fallbackOrShowError("Luồng phim hiện không có dữ liệu phát.");
          }
        }
      });

      let fatalErrorCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          return;
        }

        fatalErrorCount++;
        const httpCode = (data.response as { code?: number } | undefined)?.code;
        const isPermanentHttpError = httpCode === 403 || httpCode === 404 || httpCode === 410;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (!isPermanentHttpError && fatalErrorCount <= 2) {
              hls.startLoad();
            } else {
              fallbackOrShowError("Không thể kết nối máy chủ phát video. Vui lòng thử lại.");
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (fatalErrorCount <= 2) {
              hls.recoverMediaError();
            } else {
              fallbackOrShowError("Định dạng video không tương thích.");
            }
            break;
          default:
            if (fatalErrorCount <= 1) {
              hls.startLoad();
            } else {
              fallbackOrShowError("Luồng video gặp sự cố. Vui lòng thử lại.");
            }
            break;
        }
      });

      return () => {
        if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      let nativeBlobUrl: string | null = null;
      const abortController = new AbortController();
      nativeAbortController = abortController;

      // Clean stream and remove known ad segments for Safari/iOS AVPlayer
      createCleanNativeM3u8Url(m3u8Url, abortController.signal)
        .then((cleanUrl) => {
          nativeBlobUrl = cleanUrl;
          if (videoRef.current) {
            videoRef.current.src = cleanUrl;
          }
        })
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.src = m3u8Url;
          }
        });

      const handleLoadedMeta = () => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        seekToInitialTime(video);
        if (autoPlayRef.current) {
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch(() => {
              video.muted = true;
              onSetMutedRef.current(true);
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                  setMutedAutoplayNotice(true);
                })
                .catch(() => {
                  video.muted = false;
                  onSetMutedRef.current(false);
                  setIsPlaying(false);
                  setIsLoading(false);
                });
            });
        }
      };
      const handleError = () => {
        fallbackOrShowError("Không thể phát video.");
      };

      video.addEventListener("loadedmetadata", handleLoadedMeta, { once: true });
      video.addEventListener("error", handleError, { once: true });

      return () => {
        abortController.abort();
        if (nativeBlobUrl) {
          URL.revokeObjectURL(nativeBlobUrl);
        }
        if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
        video.removeEventListener("loadedmetadata", handleLoadedMeta);
        video.removeEventListener("error", handleError);
      };
    } else if (embedUrl) {
      if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
      onFallbackToEmbedRef.current();
    } else {
      if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
      setError("Trình duyệt không hỗ trợ phát định dạng video này.");
      setIsLoading(false);
    }
  }, [m3u8Url, preferM3U8, embedUrl, videoRef, retryNonce]);

  // Continuous stall watchdog: if isLoading remains true for 15s (including mid-stream stalls or retries),
  // automatically fall back to embed or show an error instead of spinning indefinitely.
  useEffect(() => {
    if (!isLoading || error || !preferM3U8 || !m3u8Url || m3u8Url.startsWith("offline://")) {
      return;
    }

    const stallTimer = window.setTimeout(() => {
      const v = videoRef.current;
      // Do not tear down HLS if video actually recovered playback and is ready
      if (v && !v.paused && v.readyState >= 3) {
        setIsLoading(false);
        return;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (embedUrl) {
        onFallbackToEmbedRef.current();
      } else {
        setError("Luồng phim bị gián đoạn hoặc phản hồi quá chậm. Vui lòng thử lại.");
        setIsLoading(false);
      }
    }, 15000);

    return () => window.clearTimeout(stallTimer);
  }, [isLoading, error, preferM3U8, m3u8Url, embedUrl, videoRef]);

  // Video time, buffer, and auto-next listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!video.paused && video.readyState >= 3 && isLoadingRef.current) {
        setIsLoading(false);
      }
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      onTimeUpdateRef.current?.(video.currentTime, video.duration || 0);

      if (video.buffered.length > 0) {
        for (let i = video.buffered.length - 1; i >= 0; i--) {
          if (video.buffered.start(i) <= video.currentTime) {
            setBufferedEnd(video.buffered.end(i));
            break;
          }
        }
      }

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
      setIsLoading(false);
    };
    const handleWaiting = () => {
      if (!video.paused) setIsLoading(true);
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedData = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // Only auto-advance when playback genuinely reached the end (not on premature MediaSource errors)
      const reachedRealEnd =
        !Number.isFinite(video.duration) ||
        video.duration <= 0 ||
        video.currentTime >= Math.max(0, video.duration - 5);
      if (hasNextEpisode && onNextEpisodeRef.current && reachedRealEnd) {
        onNextEpisodeRef.current();
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
  }, [hasNextEpisode, videoRef]);

  function setQuality(index: number) {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQualityIndex(index);
    }
  }

  function retryPlayback() {
    setError(null);
    setIsLoading(true);
    setRetryNonce((prev) => prev + 1);
  }

  return {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    bufferedEnd,
    isLoading,
    setIsLoading,
    error,
    setError,
    qualities,
    currentQualityIndex,
    setQuality,
    autoNextCountdown,
    mutedAutoplayNotice,
    setMutedAutoplayNotice,
    retryPlayback,
  };
}
