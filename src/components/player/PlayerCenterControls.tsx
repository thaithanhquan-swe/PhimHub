import { AlertCircle, Loader2, Lock, Play, Smartphone, VolumeX } from "lucide-react";

interface PlayerCenterControlsProps {
  isLoading: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isScreenLocked: boolean;
  error: string | null;
  toastMessage: string | null;
  mutedAutoplayNotice: boolean;
  embedUrl?: string;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onDismissMutedAutoplay: () => void;
  onRetry: () => void;
  onUseFallback?: () => void;
}

export function PlayerCenterControls({
  isLoading,
  isPlaying,
  isMuted,
  isScreenLocked,
  error,
  toastMessage,
  mutedAutoplayNotice,
  embedUrl,
  onTogglePlay,
  onToggleMute,
  onDismissMutedAutoplay,
  onRetry,
  onUseFallback,
}: PlayerCenterControlsProps) {
  return (
    <>
      {/* Toast Notification (Screen lock/unlock, orientation switch, audio boost) */}
      {toastMessage && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 rounded-full bg-black/85 border border-white/20 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {toastMessage.includes("khóa") ? (
              <Lock className="size-3.5 text-primary" />
            ) : (
              <Smartphone className="size-3.5 text-primary rotate-90" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Big Center Play Button when paused and not actively loading */}
      {!isPlaying && !isLoading && !error && !isScreenLocked && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/35 transition-colors">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="pointer-events-auto grid size-16 sm:size-20 place-items-center rounded-full bg-primary/95 text-white shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95"
            aria-label="Phát video"
          >
            <Play className="size-8 sm:size-10 fill-current ml-1 text-white" />
          </button>
        </div>
      )}

      {/* Buffering Spinner (Only when actively loading/buffering) */}
      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/50 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="size-11 animate-spin text-primary" />
            <span className="text-xs text-white/85 font-medium drop-shadow">Đang tải luồng phim...</span>
          </div>
        </div>
      )}

      {/* Muted Autoplay Indicator Notification */}
      {mutedAutoplayNotice && isPlaying && isMuted && !isScreenLocked && (
        <button
          type="button"
          onClick={() => {
            onToggleMute();
            onDismissMutedAutoplay();
          }}
          className="absolute top-16 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md hover:bg-primary transition-all active:scale-95 animate-in fade-in"
        >
          <VolumeX className="size-4" />
          <span>Bấm để bật âm thanh 🔊</span>
        </button>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
          <AlertCircle className="mb-2 size-10 text-primary" />
          <p className="text-sm font-semibold text-white">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              <span>Thử lại</span>
            </button>
            {embedUrl && onUseFallback && (
              <button
                type="button"
                onClick={onUseFallback}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                <span>Máy chủ dự phòng</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
