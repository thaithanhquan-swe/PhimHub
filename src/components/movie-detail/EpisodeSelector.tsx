import { cn } from "@/lib/utils";
import type { EpisodeItem, EpisodeServer } from "@/services/movieApi";

interface EpisodeSelectorProps {
  currentServer?: EpisodeServer;
  currentEpisodeIndex: number;
  onSelectEpisode: (episodeIndex: number) => void;
}

export function EpisodeSelector({
  currentServer,
  currentEpisodeIndex,
  onSelectEpisode,
}: EpisodeSelectorProps) {
  if (!currentServer || !currentServer.items || currentServer.items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-md border border-white/10 bg-[#1a1a1a] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90">
          Danh sách tập ({currentServer.items.length} tập)
        </h3>
        <span className="text-xs text-white/50">{currentServer.server_name}</span>
      </div>
      <div className="flex max-h-64 flex-wrap gap-1.5 sm:gap-2 overflow-y-auto pr-1">
        {currentServer.items.map((ep: EpisodeItem, idx: number) => {
          const isActive = idx === currentEpisodeIndex;
          return (
            <button
              key={ep.slug || ep.name}
              type="button"
              onClick={() => onSelectEpisode(idx)}
              className={cn(
                "min-w-10 sm:min-w-12 min-h-[38px] rounded px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all active:scale-95 inline-flex items-center justify-center",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
              )}
            >
              {ep.name.toLowerCase().includes("tập")
                ? ep.name
                : ep.name.toLowerCase() === "full"
                  ? "Bản Full"
                  : `Tập ${ep.name}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
