import { History, Play, Trash2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useWatchHistory, type WatchHistoryItem } from "@/context/WatchHistoryContext";
import { getBackdropUrl } from "@/data/movies";

export function ContinueWatchingRow() {
  const { history, removeFromHistory, clearHistory } = useWatchHistory();
  const navigate = useNavigate();

  if (history.length === 0) return null;

  return (
    <section className="relative mb-8 sm:mb-10 px-4 sm:px-[4.5%]">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-bold sm:text-xl text-white">
          <History className="size-5 text-primary" />
          <span>Tiếp tục xem ({history.length})</span>
        </h2>

        {history.length > 2 && (
          <button
            type="button"
            onClick={clearHistory}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:none]">
        {history.map((item: WatchHistoryItem) => {
          const displayEp = item.episodeName.toLowerCase().includes("tập")
            ? item.episodeName
            : item.episodeName.toLowerCase() === "full"
              ? "Bản Full"
              : `Tập ${item.episodeName}`;

          return (
            <div
              key={item.slug || item.movieId}
              className="group relative flex-none w-[240px] sm:w-[280px] rounded-lg overflow-hidden bg-[#1e1e1e] border border-white/10 hover:border-white/30 transition-all duration-300 shadow-md"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-[#121212]">
                <img
                  src={getBackdropUrl({ backdropUrl: item.backdropUrl, posterUrl: item.posterUrl })}
                  alt={item.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Progress bar accent */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                  <div className="h-full bg-primary w-2/3" />
                </div>

                {/* Center Play Button on hover */}
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/movie/${item.slug}?play=true&server=${item.serverIndex}&ep=${item.episodeIndex}`,
                    )
                  }
                  className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                  aria-label={`Xem tiếp ${item.title}`}
                >
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110">
                    <Play className="size-5 fill-current ml-0.5" />
                  </span>
                </button>

                {/* Episode Badge */}
                <span className="absolute left-2.5 top-2.5 rounded bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  Đang xem: {displayEp}
                </span>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.slug);
                  }}
                  className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/90 transition-colors"
                  aria-label="Xóa khỏi lịch sử xem"
                  title="Xóa khỏi danh sách xem tiếp"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Title & Server Info */}
              <div className="p-3">
                <Link
                  to={`/movie/${item.slug}?play=true&server=${item.serverIndex}&ep=${item.episodeIndex}`}
                  className="block font-semibold text-xs sm:text-sm text-white line-clamp-1 hover:text-primary transition-colors"
                >
                  {item.title}
                </Link>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                  <span>{item.serverName || "Vietsub"}</span>
                  <span className="text-primary font-medium hover:underline">
                    Bấm để xem tiếp →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
