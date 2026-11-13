import React from "react";
import { formatTime } from "./constants";

interface TimelineScrubberProps {
  progressPercent: number;
  bufferPercent: number;
  hoverTime: number | null;
  hoverPosition: number;
  onScrubClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubTouch: (e: React.TouchEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}

export function TimelineScrubber({
  progressPercent,
  bufferPercent,
  hoverTime,
  hoverPosition,
  onScrubClick,
  onScrubTouch,
  onMouseMove,
  onMouseLeave,
}: TimelineScrubberProps) {
  return (
    <div
      onClick={onScrubClick}
      onTouchStart={onScrubTouch}
      onTouchMove={onScrubTouch}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="group/timeline relative mb-3.5 flex h-4 w-full cursor-pointer items-center"
    >
      {/* Hover Time Tooltip */}
      {hoverTime !== null && (
        <div
          style={{ left: `${hoverPosition}%` }}
          className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-md border border-white/10"
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Background Track */}
      <div className="relative h-1 w-full rounded-full bg-white/20 transition-all group-hover/timeline:h-2">
        {/* Buffered Bar */}
        <div
          style={{ width: `${Math.min(100, bufferPercent)}%` }}
          className="absolute inset-y-0 left-0 rounded-full bg-white/40"
        />
        {/* Played Progress Bar */}
        <div
          style={{ width: `${Math.min(100, progressPercent)}%` }}
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
        />
        {/* Scrubber Thumb */}
        <div
          style={{ left: `${Math.min(100, progressPercent)}%` }}
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg ring-2 ring-white opacity-0 transition-opacity group-hover/timeline:opacity-100"
        />
      </div>
    </div>
  );
}
