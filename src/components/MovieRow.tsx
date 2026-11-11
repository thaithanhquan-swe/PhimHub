import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/data/movies";
import { cn } from "@/lib/utils";

export function MovieRow({
  title,
  movies,
}: {
  title: string;
  movies: Movie[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
  }, [updateScrollButtons, movies]);

  if (!movies.length) return null;

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

  // Mouse drag-to-scroll handlers
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
    <section className="group/row relative mb-8 sm:mb-10">
      {/* Row Header */}
      <div className="mb-3 flex items-center justify-between px-4 sm:px-[4.5%]">
        <h2 className="font-display text-base font-semibold sm:text-xl text-white">{title}</h2>
      </div>

      {/* Main Row Container with middle navigation buttons & drag support */}
      <div className="relative">
        {/* Left Arrow Button (vertically centered in the middle of card row) */}
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          aria-label={`Cuộn ${title} sang trái`}
          className={cn(
            "absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-30 grid size-10 sm:size-12 place-items-center rounded-full bg-black/80 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollLeft
              ? "opacity-90 sm:opacity-0 sm:group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="size-6 -ml-0.5 text-white" />
        </button>

        {/* Scrollable & Draggable Movie Cards Grid */}
        <div
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleClickCapture}
          onScroll={updateScrollButtons}
          className={cn(
            "hide-scrollbar grid grid-flow-col auto-cols-[38vw] gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:auto-cols-[19vw] sm:gap-3 sm:px-[4.5%] lg:auto-cols-[15vw] xl:auto-cols-[12.5vw]",
            isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          )}
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>

        {/* Right Arrow Button (vertically centered in the middle of card row) */}
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          aria-label={`Cuộn ${title} sang phải`}
          className={cn(
            "absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-30 grid size-10 sm:size-12 place-items-center rounded-full bg-black/80 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollRight
              ? "opacity-90 sm:opacity-0 sm:group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="size-6 -mr-0.5 text-white" />
        </button>
      </div>
    </section>
  );
}
