import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type ParsedTrailer =
  | { type: "youtube"; id: string }
  | { type: "video"; url: string };

/**
 * Parses a trailer source which may be:
 * - An 11-character YouTube video ID (e.g. from Cinemeta)
 * - A YouTube URL (watch?v=..., youtu.be/..., embed/...)
 * - A direct video file or stream (.mp4, .webm, .m3u8)
 */
export function parseTrailerSource(source?: string | null): ParsedTrailer | null {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;

  // Direct video file or stream
  if (/\.(mp4|webm|m3u8|ogg)(\?.*)?$/i.test(trimmed)) {
    return { type: "video", url: trimmed };
  }

  // 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: "youtube", id: trimmed };
  }

  // YouTube URLs
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return { type: "youtube", id: ytMatch[1] };
  }

  return null;
}

interface TrailerBackgroundProps {
  backdropUrl: string;
  trailerSource?: string | null;
  title: string;
  className?: string;
  imageClassName?: string;
  priority?: "high" | "auto";
  isActive?: boolean;
  onEnded?: () => void;
}

export function TrailerBackground({
  backdropUrl,
  trailerSource,
  title,
  className,
  imageClassName,
  priority = "auto",
  isActive = true,
  onEnded,
}: TrailerBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const parsedTrailer = useMemo(() => {
    if (!isActive) return null;
    return parseTrailerSource(trailerSource);
  }, [trailerSource, isActive]);

  // Track system preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePref = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePref();
    mediaQuery.addEventListener("change", updatePref);
    return () => mediaQuery.removeEventListener("change", updatePref);
  }, []);

  // Measure container dimensions to perfectly crop 16:9 video and hide YouTube UI/logo
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !parsedTrailer) return;

    const updateDims = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth > 0 && clientHeight > 0) {
        setDims({ width: clientWidth, height: clientHeight });
      }
    };

    updateDims();
    const observer = new ResizeObserver(updateDims);
    observer.observe(container);
    return () => observer.disconnect();
  }, [parsedTrailer]);

  // Always reset playing state when trailer changes or becomes inactive
  const trailerKey = parsedTrailer
    ? parsedTrailer.type === "youtube"
      ? parsedTrailer.id
      : parsedTrailer.url
    : null;

  useEffect(() => {
    setIsPlaying(false);
  }, [trailerKey, isActive]);

  // Send commands to YouTube iframe
  const sendYouTubeCommand = (func: string, args: unknown[] = []) => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
      }
    } catch {
      // Ignore cross-origin error
    }
  };

  const kickstartYouTube = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ event: "listening" }), "*");
      }
      sendYouTubeCommand("mute");
      sendYouTubeCommand("playVideo");
    } catch {
      // Ignore
    }
  };

  // Listen for YouTube postMessage API events
  useEffect(() => {
    if (!isActive || parsedTrailer?.type !== "youtube") return;

    const handleMessage = (e: MessageEvent) => {
      if (
        typeof e.origin === "string" &&
        !e.origin.includes("youtube.com") &&
        !e.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;

        // When YouTube player reports ready, immediately kickstart playback
        if (data?.event === "onReady") {
          kickstartYouTube();
        }

        // Determine playerState from either onStateChange or infoDelivery
        const state =
          data?.event === "onStateChange" && typeof data?.info === "number"
            ? data.info
            : data?.event === "infoDelivery" &&
              typeof data?.info?.playerState === "number"
            ? data.info.playerState
            : undefined;

        if (state !== undefined) {
          // YouTube PlayerState:
          // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
          if (state === 1) {
            // Video is ACTIVELY PLAYING frames! Fade in video, completely hide backdrop!
            setIsPlaying(true);
          } else if (state === 2) {
            // Paused: IMMEDIATELY set isPlaying=false to hide iframe (so pause icon || NEVER appears)
            setIsPlaying(false);
            // Attempt to resume playback immediately
            sendYouTubeCommand("playVideo");
          } else if (state === 0) {
            // Ended: hide iframe so no end screen/replay button appears
            setIsPlaying(false);
            if (onEnded) {
              onEnded();
            } else {
              sendYouTubeCommand("playVideo");
            }
          } else if (state === 3 || state === -1) {
            // Buffering or unstarted: keep iframe hidden so pause icon is invisible
            setIsPlaying(false);
          }
        }

        // If YouTube encountered an error (e.g. 150 owner disabled embed), advance smoothly
        if (data?.event === "onError") {
          setIsPlaying(false);
          onEnded?.();
        }
      } catch {
        // Ignore non-JSON postMessage from third-party scripts or extensions
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isActive, parsedTrailer, onEnded]);

  // Fallback watchdog: If active trailer has not started playing within 8 seconds (e.g. blocked/error),
  // call onEnded so Hero moves to next slide smoothly without getting stuck
  useEffect(() => {
    if (!isActive || !parsedTrailer || isPlaying) return;

    const timeout = window.setTimeout(() => {
      if (!isPlaying) {
        onEnded?.();
      }
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [isActive, parsedTrailer, isPlaying, onEnded]);

  // Calculate exact scaled 16:9 dimensions:
  // Scale factor (1.4x) crops ~20% from top and bottom, pushing YouTube title bar, watermark, and edge UI completely outside the container!
  const videoStyle = useMemo(() => {
    const scale = 1.4;
    const targetRatio = 16 / 9;

    if (!dims) {
      return {
        position: "absolute" as const,
        top: "50%",
        left: "50%",
        width: "max(100%, 178vh)",
        height: "max(100%, 56.25vw)",
        minWidth: "140%",
        minHeight: "140%",
        transform: "translate(-50%, -50%) scale(1.4)",
        pointerEvents: "none" as const,
      };
    }

    const containerRatio = dims.width / dims.height;
    let width: number;
    let height: number;

    if (containerRatio > targetRatio) {
      width = dims.width * scale;
      height = (dims.width / targetRatio) * scale;
    } else {
      height = dims.height * scale;
      width = dims.height * targetRatio * scale;
    }

    return {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`,
      transform: "translate(-50%, -50%)",
      maxWidth: "none",
      maxHeight: "none",
      pointerEvents: "none" as const,
    };
  }, [dims]);

  const shouldRenderVideo = Boolean(isActive && parsedTrailer && !prefersReducedMotion);

  // Origin for YouTube enablejsapi communication
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 size-full overflow-hidden bg-[#121212] select-none", className)}
    >
      {/* Fallback & Loading Backdrop Image (always present underneath) */}
      <img
        src={backdropUrl}
        alt={title}
        fetchPriority={priority}
        decoding="async"
        loading={priority === "high" ? "eager" : "lazy"}
        className={cn("size-full object-cover object-[center_20%]", imageClassName)}
      />

      {/* Cinematic Trailer Background Video */}
      {shouldRenderVideo && parsedTrailer && (
        <div className="absolute inset-0 size-full overflow-hidden pointer-events-none">
          {parsedTrailer.type === "video" ? (
            <video
              src={parsedTrailer.url}
              autoPlay
              loop={!onEnded}
              muted
              playsInline
              onPlaying={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                onEnded?.();
              }}
              className={cn(
                "absolute inset-0 size-full object-cover object-center pointer-events-none transition-opacity duration-700 ease-in-out",
                isPlaying ? "opacity-100" : "opacity-0",
              )}
            />
          ) : (
            <iframe
              ref={iframeRef}
              key={parsedTrailer.id}
              // Notice: Clean params, enablejsapi=1, mute=1 and autoplay=1 without playlist parameter
              src={`https://www.youtube.com/embed/${parsedTrailer.id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
              title={`Trailer ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              tabIndex={-1}
              onLoad={() => {
                kickstartYouTube();
                setTimeout(kickstartYouTube, 200);
                setTimeout(kickstartYouTube, 600);
                setTimeout(kickstartYouTube, 1200);
              }}
              style={videoStyle}
              className={cn(
                "pointer-events-none border-0 transition-opacity duration-700 ease-in-out select-none",
                isPlaying ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            />
          )}

          {/* Absolute interaction blocker to guarantee zero clicks or gestures can reach video */}
          <div
            className="absolute inset-0 size-full z-10 select-none cursor-default"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      )}
    </div>
  );
}
