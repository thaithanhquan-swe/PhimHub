import { Volume1, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  canAdjustVolume: boolean;
  isVolumeSliderOpen: boolean;
  isTouchDevice: boolean;
  onVolumeButtonClick: () => void;
  onVolumeChange: (newVol: number, showToast?: boolean) => void;
  onToggleMute: () => void;
}

export function VolumeControl({
  volume,
  isMuted,
  canAdjustVolume,
  isVolumeSliderOpen,
  isTouchDevice,
  onVolumeButtonClick,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  return (
    <div className="group/vol relative flex items-center">
      <button
        type="button"
        onClick={onVolumeButtonClick}
        className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors"
        title={isTouchDevice ? "Điều chỉnh âm lượng & Khuếch đại" : "Bật/Tắt âm thanh (M)"}
        aria-label={isTouchDevice ? "Điều chỉnh âm lượng" : "Bật/Tắt âm thanh"}
        aria-expanded={isVolumeSliderOpen}
        aria-controls="mobile-volume-slider"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="size-4 sm:size-5 text-primary" />
        ) : volume < 0.5 ? (
          <Volume1 className="size-4 sm:size-5" />
        ) : volume <= 1 ? (
          <Volume2 className="size-4 sm:size-5" />
        ) : (
          <Volume2 className="size-4 sm:size-5 text-primary drop-shadow-[0_0_6px_rgba(229,9,20,0.6)]" />
        )}
      </button>

      {/* Desktop volume slider (Range 0 - 100%) */}
      <div
        className={cn(
          "h-9 w-0 items-center overflow-hidden transition-all duration-200 ease-out",
          !isTouchDevice && "hidden sm:flex group-hover/vol:w-20 group-hover/vol:px-1.5",
        )}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
          aria-label="Âm lượng video"
          title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          className="h-4 w-full cursor-pointer accent-primary"
          disabled={!canAdjustVolume}
        />
      </div>

      {/* Mobile volume popover */}
      {isTouchDevice && isVolumeSliderOpen && (
        <div
          id="mobile-volume-slider"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/15 bg-[#181818]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Âm lượng</span>
            <span className="font-bold text-white/70">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
            aria-label="Âm lượng video"
            className="h-8 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canAdjustVolume}
          />

          {/* Quick Volume Presets (25%, 50%, 75%, 100%) */}
          <div className="mt-2 mb-2 flex items-center gap-1.5">
            {[0.25, 0.5, 0.75, 1.0].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVolumeChange(v, true)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-bold transition-all",
                  volume === v
                    ? "bg-primary text-white shadow-sm shadow-primary/40 scale-105"
                    : "bg-white/10 text-white/80 hover:bg-white/20 active:scale-95",
                )}
              >
                {Math.round(v * 100)}%
              </button>
            ))}
          </div>

          {canAdjustVolume ? (
            <button
              type="button"
              onClick={onToggleMute}
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
  );
}
