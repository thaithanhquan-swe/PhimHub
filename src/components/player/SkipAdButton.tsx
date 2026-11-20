import { FastForward } from "lucide-react";

interface SkipAdButtonProps {
  currentTime: number;
  duration: number;
  isScreenLocked: boolean;
  onSkipAd: (seconds?: number) => void;
}

export function SkipAdButton({
  currentTime,
  duration,
  isScreenLocked,
  onSkipAd,
}: SkipAdButtonProps) {
  // Only display while in the ad segment (first 85 seconds) and video is long enough
  if (isScreenLocked || currentTime >= 85 || duration <= 60) {
    return null;
  }

  return (
    <div
      data-testid="skip-ad-button"
      className="absolute bottom-24 sm:bottom-28 right-4 sm:right-8 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <button
        type="button"
        onClick={() => onSkipAd(85)}
        className="group flex items-center gap-2 rounded-[3px] border border-white/60 bg-black/60 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-2xl backdrop-blur-sm transition-all duration-150 hover:border-white hover:bg-white hover:text-black active:scale-95 cursor-pointer"
        title="Bỏ qua quảng cáo (Phím tắt S)"
      >
        <span>Bỏ qua quảng cáo</span>
        <FastForward className="size-3.5 sm:size-4 fill-current transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
