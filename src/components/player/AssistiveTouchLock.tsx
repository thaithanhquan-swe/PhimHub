import { Lock } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

interface AssistiveTouchLockProps {
  isScreenLocked: boolean;
  showUnlockButton: boolean;
  lockButtonPos: { x: number; y: number } | null;
  isDraggingLock: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onUnlock: () => void;
}

export function AssistiveTouchLock({
  isScreenLocked,
  showUnlockButton,
  lockButtonPos,
  isDraggingLock,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onUnlock,
}: AssistiveTouchLockProps) {
  if (!isScreenLocked) return null;

  return (
    <div
      data-testid="assistive-lock-button"
      style={{
        transform: lockButtonPos
          ? `translate3d(${lockButtonPos.x}px, ${lockButtonPos.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "absolute top-0 left-0 z-50 select-none cursor-grab active:cursor-grabbing",
        !lockButtonPos && "left-3.5 sm:left-4 top-1/2 -translate-y-1/2",
        isDraggingLock ? "transition-none" : "transition-all duration-300 ease-out",
        showUnlockButton || isDraggingLock
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-45 hover:opacity-100 scale-95 pointer-events-auto",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnlock();
        }}
        className="group/assistive relative flex items-center justify-center size-13 sm:size-14 rounded-full bg-[#18181b]/80 backdrop-blur-xl border border-white/25 shadow-2xl transition-transform duration-150 active:scale-95 hover:scale-105"
        title="Nhấn để mở khóa • Kéo để di chuyển"
        aria-label="Mở khóa màn hình"
      >
        {/* Outer concentric frosted glass ring */}
        <div className="size-10 sm:size-11 rounded-full border border-white/30 bg-white/10 flex items-center justify-center shadow-inner group-hover/assistive:border-white/50 transition-colors">
          {/* Inner core circle */}
          <div className="size-7 sm:size-8 rounded-full bg-white/20 border border-white/50 flex items-center justify-center shadow-md group-hover/assistive:bg-primary/80 group-hover/assistive:border-primary transition-colors">
            <Lock className="size-3.5 sm:size-4 text-white stroke-[2.5] drop-shadow" />
          </div>
        </div>

        {/* Subtle Pulse Halo when active */}
        {showUnlockButton && (
          <span className="absolute -inset-1 rounded-full border border-primary/50 animate-ping opacity-30 pointer-events-none" />
        )}
      </button>

      {/* Mini "Mở khóa" badge hint */}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 border border-white/20 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur-sm transition-opacity duration-200",
          showUnlockButton || isDraggingLock ? "opacity-100" : "opacity-0",
          lockButtonPos && lockButtonPos.y > 100 ? "-top-6" : "-bottom-6",
        )}
      >
        Mở khóa
      </span>
    </div>
  );
}
