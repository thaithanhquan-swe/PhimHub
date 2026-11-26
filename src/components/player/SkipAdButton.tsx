import { FastForward, X } from "lucide-react";
import type { AdRange } from "@/lib/adBlockPlaylist";

interface SkipAdButtonProps {
  currentTime: number;
  duration: number;
  isScreenLocked: boolean;
  hasAd?: boolean;
  adDuration?: number;
  adRanges?: AdRange[];
  showIntroFallback?: boolean;
  onSkipAd: (seconds?: number) => void;
  onSkipIntro?: () => void;
  onDismissIntroFallback?: () => void;
}

export function getActiveAdTarget({
  currentTime,
  duration,
  hasAd = false,
  adDuration = 85,
  adRanges,
}: {
  currentTime: number;
  duration: number;
  hasAd?: boolean;
  adDuration?: number;
  adRanges?: AdRange[];
}): number | null {
  if (duration <= 60) return null;

  if (adRanges && adRanges.length > 0) {
    const activeRange = adRanges.find(
      (range) => currentTime >= range.start && currentTime < range.end,
    );
    return activeRange ? activeRange.end : null;
  }

  const threshold = adDuration > 0 ? adDuration : 85;
  if (!hasAd || currentTime >= threshold) {
    return null;
  }
  return threshold;
}

export function SkipAdButton({
  currentTime,
  duration,
  isScreenLocked,
  hasAd = false,
  adDuration = 85,
  adRanges,
  showIntroFallback = false,
  onSkipAd,
  onSkipIntro,
  onDismissIntroFallback,
}: SkipAdButtonProps) {
  if (isScreenLocked) {
    return null;
  }

  const activeTarget = getActiveAdTarget({
    currentTime,
    duration,
    hasAd,
    adDuration,
    adRanges,
  });

  if (activeTarget !== null) {
    return (
      <div
        data-testid="skip-ad-button"
        className="absolute bottom-24 sm:bottom-28 right-4 sm:right-8 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          type="button"
          onClick={() => onSkipAd(activeTarget)}
          className="group flex items-center gap-2 rounded-[3px] border border-white/60 bg-black/65 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-2xl transition-all duration-150 hover:border-white hover:bg-white hover:text-black active:scale-95 cursor-pointer"
          title="Bỏ qua quảng cáo (Phím tắt S)"
        >
          <span>Bỏ qua quảng cáo</span>
          <FastForward className="size-3.5 sm:size-4 fill-current transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    );
  }

  // Fallback for streams with burned-in ads or opening intros (e.g. PhimAPI OP/intro without HLS discontinuity tags)
  if (showIntroFallback && duration > 180 && currentTime < 240 && onSkipIntro) {
    return (
      <div
        data-testid="skip-intro-button"
        className="absolute bottom-24 sm:bottom-28 right-4 sm:right-8 z-30 flex items-center overflow-hidden rounded-[3px] border border-white/45 bg-black/65 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          type="button"
          onClick={onSkipIntro}
          className="group flex items-center gap-2 px-3.5 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white transition-colors duration-150 hover:bg-white hover:text-black active:scale-95 cursor-pointer"
          title="Tua nhanh 15 giây đoạn giới thiệu / quảng cáo (Phím tắt S)"
        >
          <span>Bỏ qua giới thiệu</span>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold group-hover:bg-black/10">
            +15s
          </span>
          <FastForward className="size-3.5 sm:size-4 fill-current transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
        {onDismissIntroFallback && (
          <button
            type="button"
            onClick={onDismissIntroFallback}
            className="border-l border-white/20 px-2 py-2 sm:py-2.5 text-white/60 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            title="Ẩn nút bỏ qua giới thiệu"
            aria-label="Ẩn nút bỏ qua giới thiệu"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return null;
}
