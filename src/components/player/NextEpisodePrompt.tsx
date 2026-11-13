import { SkipForward } from "lucide-react";

interface NextEpisodePromptProps {
  countdown: number | null;
  hasNextEpisode: boolean;
  isScreenLocked: boolean;
  onNextEpisode?: () => void;
}

export function NextEpisodePrompt({
  countdown,
  hasNextEpisode,
  isScreenLocked,
  onNextEpisode,
}: NextEpisodePromptProps) {
  if (countdown === null || !hasNextEpisode || !onNextEpisode || isScreenLocked) {
    return null;
  }

  return (
    <div className="absolute bottom-20 right-4 z-30 flex items-center gap-3 rounded-xl border border-white/20 bg-black/85 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300">
      <div className="text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tập tiếp theo</p>
        <p className="text-xs font-bold text-white">Chuyển sau {countdown}s...</p>
      </div>
      <button
        type="button"
        onClick={onNextEpisode}
        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <span>Xem ngay</span>
        <SkipForward className="size-3.5 fill-current" />
      </button>
    </div>
  );
}
