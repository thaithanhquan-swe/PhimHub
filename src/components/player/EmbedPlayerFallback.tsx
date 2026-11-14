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
          className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg bg-black/85 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md hover:bg-primary transition-all active:scale-95"
        >
          <span>Phát nguồn trực tiếp (HLS)</span>
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
      <div className="absolute bottom-2 left-2 z-30 rounded-md bg-black/75 px-2.5 py-1.5 text-[10px] text-white/85 shadow backdrop-blur-sm">
        Embed: chất lượng/tốc độ do nguồn quản lý. Lỗi phát? Thử máy chủ khác bên trên.
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
