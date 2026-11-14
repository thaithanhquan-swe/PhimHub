import { Maximize, Minimize } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface EmbedPlayerFallbackProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  embedUrl: string;
  title: string;
  m3u8Url?: string;
  isDeviceLandscape: boolean;
  isManualFullscreen: boolean;
  isFullscreen: boolean;
  isLandscapeView: boolean;
  onSwitchToHls: () => void;
  onToggleOrientation: () => void;
}

export function EmbedPlayerFallback({
  containerRef,
  embedUrl,
  title,
  m3u8Url,
  isDeviceLandscape,
  isManualFullscreen,
  isFullscreen,
  isLandscapeView,
  onSwitchToHls,
  onToggleOrientation,
}: EmbedPlayerFallbackProps) {
  const isLandscape = isLandscapeView || isFullscreen || isManualFullscreen;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10 group/embed",
        (isDeviceLandscape || isManualFullscreen || isFullscreen) && "player-landscape-mode",
      )}
    >
      {m3u8Url && (
        <button
          type="button"
          onClick={onSwitchToHls}
          className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg bg-black/85 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 shadow-xl backdrop-blur-md hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
        >
          <span>🛡️ Phát nguồn trực tiếp (HLS - Không QC)</span>
        </button>
      )}
      <button
        type="button"
        onClick={onToggleOrientation}
        className="absolute left-2 top-2 z-30 grid size-9 place-items-center rounded-full bg-black/70 text-white/90 backdrop-blur-sm hover:bg-black"
        title={isLandscape ? "Chế độ dọc" : "Xoay ngang màn hình"}
        aria-label={isLandscape ? "Chế độ dọc" : "Xoay ngang màn hình"}
      >
        {isLandscape ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      </button>
      <div className="absolute bottom-2 left-2 z-30 rounded-md bg-black/80 px-2.5 py-1.5 text-[10px] text-amber-200/90 shadow backdrop-blur-sm border border-amber-500/20">
        Embed: chất lượng/tốc độ do nguồn quản lý (có thể có QC từ nguồn). Bấm "Phát nguồn trực tiếp" góc trên để chặn quảng cáo.
      </div>
      <iframe
        key={embedUrl}
        src={embedUrl}
        title={title}
        className="size-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        allowFullScreen
        referrerPolicy="origin"
      />
    </div>
  );
}
