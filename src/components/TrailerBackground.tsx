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
}

export function TrailerBackground({
  backdropUrl,
  trailerSource,
  title,
  className,
  imageClassName,
  priority = "auto",
  isActive = true,
}: TrailerBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
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

  // Reset video loaded state when trailer changes
  useEffect(() => {
    setIsVideoLoaded(false);
  }, [parsedTrailer?.type === "youtube" ? parsedTrailer.id : parsedTrailer?.type === "video" ? parsedTrailer.url : null]);

  // Calculate exact scaled 16:9 dimensions:
  // Scale factor (1.35x) crops ~17.5% from top and bottom, pushing YouTube title bar and watermark outside the container!
  const videoStyle = useMemo(() => {
    const scale = 1.35;
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
        transform: "translate(-50%, -50%) scale(1.35)",
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
    };
  }, [dims]);

  const shouldRenderVideo = Boolean(isActive && parsedTrailer && !prefersReducedMotion);

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
              loop
              muted
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              className={cn(
                "absolute inset-0 size-full object-cover object-center pointer-events-none transition-opacity duration-1000",
                isVideoLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : (
            <iframe
              key={parsedTrailer.id}
              src={`https://www.youtube-nocookie.com/embed/${parsedTrailer.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${parsedTrailer.id}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&showinfo=0&vq=hd1080`}
              title={`Trailer ${title}`}
              allow="autoplay; encrypted-media; picture-in-picture"
              tabIndex={-1}
              onLoad={() => {
                // Short timer ensures video frame has started before fading in
                setTimeout(() => setIsVideoLoaded(true), 400);
              }}
              style={videoStyle}
              className={cn(
                "pointer-events-none border-0 transition-opacity duration-1000 ease-in-out",
                isVideoLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
