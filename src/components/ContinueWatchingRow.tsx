import { ChevronLeft, ChevronRight, History, Play, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useWatchHistory, type WatchHistoryItem } from "@/context/WatchHistoryContext";
import { getBackdropUrl } from "@/data/movies";
import { cn } from "@/lib/utils";

export function ContinueWatchingRow() {
  const { history, removeFromHistory, clearHistory } = useWatchHistory();
  const navigate = useNavigate();

  const rowRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [updateScrollButtons, history]);

  if (history.length === 0) return null;

  function scroll(direction: number) {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.style.scrollBehavior = "smooth";
    rowRef.current.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
    setTimeout(updateScrollButtons, 350);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0 || !rowRef.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - rowRef.current.offsetLeft;
    scrollLeftRef.current = rowRef.current.scrollLeft;
    rowRef.current.style.scrollBehavior = "auto";
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDownRef.current || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 6) {
      hasDraggedRef.current = true;
      if (!isDragging) setIsDragging(true);
    }
    rowRef.current.scrollLeft = scrollLeftRef.current - walk;
    updateScrollButtons();
  }

  function handleMouseUpOrLeave() {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    if (rowRef.current) {
      rowRef.current.style.scrollBehavior = "smooth";
    }
    setTimeout(() => {
      setIsDragging(false);
      hasDraggedRef.current = false;
    }, 60);
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <section className="group/row relative mb-8 sm:mb-10 px-4 sm:px-[4.5%]">
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

      <div className="relative">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          aria-label="Cuộn lịch sử sang trái"
          className={cn(
            "absolute -left-2 sm:left-1 top-1/2 -translate-y-1/2 z-30 grid size-10 sm:size-11 place-items-center rounded-full bg-black/80 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollLeft
              ? "opacity-90 sm:opacity-0 sm:group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="size-5 text-white -ml-0.5" />
        </button>

        {/* Horizontal Container with drag support */}
        <div
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleClickCapture}
          onScroll={updateScrollButtons}
          className={cn(
            "hide-scrollbar flex gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]",
            isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          )}
        >
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
                    draggable={false}
                    className="size-full object-cover pointer-events-none select-none"
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
                    <span className="grid size-11 place-items-center rounded-full bg-primary text-white shadow-lg">
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

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          aria-label="Cuộn lịch sử sang phải"
          className={cn(
            "absolute -right-2 sm:right-1 top-1/2 -translate-y-1/2 z-30 grid size-10 sm:size-11 place-items-center rounded-full bg-black/80 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollRight
              ? "opacity-90 sm:opacity-0 sm:group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="size-5 text-white -mr-0.5" />
        </button>
      </div>
    </section>
  );
}
