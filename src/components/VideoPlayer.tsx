import Hls from "hls.js";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function VideoPlayer({
  m3u8Url,
  embedUrl,
  title,
  poster,
  autoPlay = true,
  onEnded,
}: {
  m3u8Url?: string;
  embedUrl?: string;
  title: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  // If m3u8 is not provided, use embed immediately
  const preferM3U8 = Boolean(m3u8Url && !useEmbedFallback);

  useEffect(() => {
    setError(null);
    setIsLoading(true);

    if (!preferM3U8 || !m3u8Url) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Native HLS support (Safari on macOS and iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8Url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with audio was blocked by browser, try muted or wait for user click
          });
        }
      });
      video.addEventListener("waiting", () => setIsLoading(true));
      video.addEventListener("playing", () => setIsLoading(false));
      video.addEventListener("error", () => {
        console.warn("[VideoPlayer] Native HLS error, switching to embed fallback...");
        if (embedUrl) setUseEmbedFallback(true);
        else setError("Không thể phát luồng video này.");
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

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked, user will click play
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("[HLS] Network error, recovering...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[HLS] Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              console.error("[HLS] Fatal error:", data);
              hls.destroy();
              if (embedUrl) {
                console.log("[HLS] Falling back to embed iframe...");
                setUseEmbedFallback(true);
              } else {
                setError("Luồng video gặp sự cố. Vui lòng thử lại.");
              }
              break;
          }
        }
      });

      video.addEventListener("waiting", () => setIsLoading(true));
      video.addEventListener("playing", () => setIsLoading(false));

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

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10 select-none">
      {/* Native HTML5 Video Player with HLS */}
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster}
        onEnded={onEnded}
        className="size-full object-contain bg-black"
        preload="metadata"
      />

      {/* Buffering Spinner */}
      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px] transition-opacity">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-10 animate-spin text-primary" />
            <span className="text-xs font-medium text-white/80">Đang nạp dữ liệu phim...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <RefreshCw className="size-3.5" />
              <span>Thử lại</span>
            </button>
            {embedUrl && (
              <button
                type="button"
                onClick={() => setUseEmbedFallback(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                <span>Chuyển sang máy chủ dự phòng</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
