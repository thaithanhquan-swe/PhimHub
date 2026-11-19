import { FastForward, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SkipAdButtonProps {
  currentTime: number;
  duration: number;
  isScreenLocked: boolean;
  onSkipAd: (seconds?: number) => void;
  defaultSkipSeconds?: number;
}

export function SkipAdButton({
  currentTime,
  duration,
  isScreenLocked,
  onSkipAd,
  defaultSkipSeconds = 85,
}: SkipAdButtonProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedSeconds, setSelectedSeconds] = useState(defaultSkipSeconds);

  // Reset dismissed state whenever video restarts or loads a new episode
  useEffect(() => {
    if (currentTime < 2) {
      setIsDismissed(false);
    }
  }, [currentTime]);

  // Keep selectedSeconds synced with defaultSkipSeconds if changed from settings
  useEffect(() => {
    if (defaultSkipSeconds > 0) {
      setSelectedSeconds(defaultSkipSeconds);
    }
  }, [defaultSkipSeconds]);

  // Only display during early playback (first 120s) and when video is at least 150s long
  if (isScreenLocked || isDismissed || currentTime >= 120 || duration <= 150) {
    return null;
  }

  const handleSkip = (sec: number) => {
    setSelectedSeconds(sec);
    onSkipAd(sec);
  };

  return (
    <div
      data-testid="skip-ad-button"
      className="absolute bottom-20 right-3 sm:right-5 z-30 flex items-center gap-1 sm:gap-1.5 rounded-xl border border-amber-500/40 bg-black/90 p-1 sm:p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <button
        type="button"
        onClick={() => handleSkip(selectedSeconds)}
        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-extrabold px-2.5 sm:px-3 py-1.5 text-xs shadow-md transition-all hover:scale-105 active:scale-95"
        title={`Bỏ qua quảng cáo / Intro (+${selectedSeconds}s)`}
      >
        <Zap className="size-3.5 fill-current" />
        <span>Bỏ qua quảng cáo</span>
        <span className="text-[11px] opacity-80">(+{selectedSeconds}s)</span>
        <FastForward className="size-3.5 fill-current" />
      </button>

      {/* Quick presets for common ad durations */}
      <div className="flex items-center gap-0.5 border-l border-white/15 pl-1 text-[11px]">
        {[30, 60, 85].map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => handleSkip(sec)}
            className={cn(
              "rounded px-1.5 py-0.5 font-bold transition-colors",
              selectedSeconds === sec
                ? "bg-amber-400/25 text-amber-300"
                : "text-white/60 hover:text-white hover:bg-white/10",
            )}
            title={`Bỏ qua ${sec} giây`}
          >
            {sec}s
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="grid size-6 place-items-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
        title="Đóng thông báo"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
