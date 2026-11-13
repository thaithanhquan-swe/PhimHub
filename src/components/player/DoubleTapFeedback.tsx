import { RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DoubleTapFeedbackState } from "./types";

interface DoubleTapFeedbackProps {
  feedback: DoubleTapFeedbackState;
}

export function DoubleTapFeedback({ feedback }: DoubleTapFeedbackProps) {
  if (!feedback) return null;

  return (
    <div
      data-testid={`double-tap-${feedback.side}-feedback`}
      className={cn(
        "pointer-events-none absolute inset-y-0 z-30 flex w-1/2 items-center justify-center select-none overflow-hidden",
        feedback.side === "left" ? "left-0" : "right-0",
      )}
    >
      {/* Semi-circular curved ripple glow backdrop */}
      <div
        className={cn(
          "absolute inset-y-0 w-full transition-all duration-300",
          feedback.side === "left"
            ? "left-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-r-full"
            : "right-0 bg-gradient-to-l from-white/20 via-white/10 to-transparent rounded-l-full",
        )}
      />

      {/* Center animated badge */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 text-white animate-double-tap">
        <div className="grid size-14 sm:size-16 place-items-center rounded-full bg-black/75 backdrop-blur-md border border-white/25 shadow-2xl text-white">
          {feedback.side === "left" ? (
            <RotateCcw className="size-7 sm:size-8 stroke-[2.5] text-white -rotate-12 transition-transform duration-200" />
          ) : (
            <RotateCw className="size-7 sm:size-8 stroke-[2.5] text-white rotate-12 transition-transform duration-200" />
          )}
        </div>
        <span className="text-base sm:text-lg font-black tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {feedback.side === "left" ? `-${feedback.seconds}s` : `+${feedback.seconds}s`}
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-widest drop-shadow">
          {feedback.side === "left"
            ? `Lùi ${feedback.seconds} giây`
            : `Tua ${feedback.seconds} giây`}
        </span>
      </div>
    </div>
  );
}
