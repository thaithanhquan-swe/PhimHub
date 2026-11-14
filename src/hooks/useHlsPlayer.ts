import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { AUTO_QUALITY, type QualityOption } from "@/components/player";
import { createCleanNativeM3u8Url, PlaylistAdBlockLoader } from "@/lib/adBlockPlaylist";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<QualityOption[]>([AUTO_QUALITY]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [mutedAutoplayNotice, setMutedAutoplayNotice] = useState(false);

  // Initial resume seek
  const seekToInitialTime = useCallback(
    (video: HTMLVideoElement) => {
      if (initialTime <= 0 || initialSeekAppliedRef.current) return;
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = dur > 0 ? Math.min(initialTime, Math.max(0, dur - 1)) : initialTime;
      try {
        video.currentTime = targetTime;
        initialSeekAppliedRef.current = true;
        setCurrentTime(targetTime);
      } catch (err) {
        console.warn("Could not resume video at saved position:", err);
      }
    },
    [initialTime],
  );

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

    const timeoutTimer = window.setTimeout(() => {
      const v = videoRef.current;
      const hls = hlsRef.current;
      const hasParsedLevels = Boolean(hls && hls.levels && hls.levels.length > 0);
      const hasLoadedFrames = Boolean(v && v.readyState > 0);

      if (v && !hasLoadedFrames && !isPlayingRef.current && !hasParsedLevels) {
        console.warn("HLS load timed out after 18s, falling back to embed player");
        if (embedUrl) {
          onFallbackToEmbedRef.current();
        } else {
          setIsLoading(false);
        }
      }
    }, 18000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 2.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 10,
        maxFragLookUpTolerance: 0.5,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 12000,
        levelLoadingMaxRetry: 4,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
        startLevel: -1,
        pLoader: PlaylistAdBlockLoader as any,
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

        if (autoPlay) {
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

      let fatalErrorCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          // Handle non-fatal buffer gaps or stalls caused by removed ad segments
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
          ) {
            const v = videoRef.current;
            if (v && !v.paused && v.readyState >= 2) {
              v.currentTime += 0.2;
            }
          }
          return;
        }

        fatalErrorCount++;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (fatalErrorCount <= 4) {
              hls.startLoad();
            } else {
              hls.destroy();
              if (embedUrl) {
                onFallbackToEmbedRef.current();
              } else {
                setError("Không thể kết nối máy chủ phát video. Vui lòng thử lại.");
                setIsLoading(false);
              }
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (fatalErrorCount <= 4) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
              if (embedUrl) {
                onFallbackToEmbedRef.current();
              } else {
                setError("Định dạng video không tương thích.");
                setIsLoading(false);
              }
            }
            break;
          default:
            if (fatalErrorCount <= 2) {
              hls.startLoad();
            } else {
              hls.destroy();
              if (embedUrl) {
                onFallbackToEmbedRef.current();
              } else {
                setError("Luồng video gặp sự cố. Vui lòng thử lại.");
                setIsLoading(false);
              }
            }
            break;
        }
      });

      return () => {
        window.clearTimeout(timeoutTimer);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      let nativeBlobUrl: string | null = null;
      const abortController = new AbortController();

      // Clean stream and remove ads for native Apple HLS / Safari AVPlayer
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
        if (autoPlay) {
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
        if (embedUrl) {
          onFallbackToEmbedRef.current();
        } else {
          setError("Không thể phát video.");
          setIsLoading(false);
        }
      };

      video.addEventListener("loadedmetadata", handleLoadedMeta, { once: true });
      video.addEventListener("error", handleError, { once: true });

      return () => {
        abortController.abort();
        if (nativeBlobUrl) {
          URL.revokeObjectURL(nativeBlobUrl);
        }
        window.clearTimeout(timeoutTimer);
        video.removeEventListener("loadedmetadata", handleLoadedMeta);
        video.removeEventListener("error", handleError);
      };
    } else if (embedUrl) {
      onFallbackToEmbedRef.current();
    } else {
      setError("Trình duyệt không hỗ trợ phát định dạng video này.");
      setIsLoading(false);
    }
  }, [m3u8Url, preferM3U8, autoPlay, embedUrl, seekToInitialTime, videoRef]);

  // Video time, buffer, and auto-next listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
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
      if (hasNextEpisode && onNextEpisodeRef.current) {
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
    if (hlsRef.current && m3u8Url) {
      hlsRef.current.loadSource(m3u8Url);
      if (videoRef.current) hlsRef.current.attachMedia(videoRef.current);
    }
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
