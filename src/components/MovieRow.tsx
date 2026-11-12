import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/data/movies";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE_MOVIES = 6;
const MOVIES_PER_BATCH = 6;

export function MovieRow({
  title,
  movies,
}: {
  title: string;
  movies: Movie[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [visibleMovieCount, setVisibleMovieCount] = useState(INITIAL_VISIBLE_MOVIES);

  // Automatically ensure visible cards completely fill the row container on wide desktop viewports
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (
      visibleMovieCount < movies.length &&
      el.clientWidth > 0 &&
      el.scrollWidth <= el.clientWidth + 50
    ) {
      setVisibleMovieCount((count) => Math.min(count + MOVIES_PER_BATCH, movies.length));
    }
  }, [visibleMovieCount, movies.length, hasEnteredViewport]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
  }, [updateScrollButtons, movies, visibleMovieCount]);

  if (!movies.length) return null;

  function scroll(direction: number) {
    if (!rowRef.current) return;
    if (direction > 0 && visibleMovieCount < movies.length) {
      setVisibleMovieCount((count) => Math.min(count + MOVIES_PER_BATCH * 2, movies.length));
    }
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.style.scrollBehavior = "smooth";
    rowRef.current.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
    setTimeout(updateScrollButtons, 350);
  }

  function handleScroll() {
    const el = rowRef.current;
    if (!el) return;
    updateScrollButtons();
    if (
      visibleMovieCount < movies.length &&
      el.scrollLeft + el.clientWidth >= el.scrollWidth - el.clientWidth * 1.5
    ) {
      setVisibleMovieCount((count) => Math.min(count + MOVIES_PER_BATCH, movies.length));
    }
  }

  // Mouse drag-to-scroll handlers (for desktop mouse only, avoiding touch jitter)
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0 || !rowRef.current) return;
    // Don't drag if clicking buttons or if initiated by touch
    if ((e.target as HTMLElement).closest("button")) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - rowRef.current.offsetLeft;
    scrollLeftRef.current = rowRef.current.scrollLeft;
    rowRef.current.style.scrollBehavior = "auto";
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDownRef.current || !rowRef.current) return;
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 12) {
      hasDraggedRef.current = true;
      if (!isDragging) setIsDragging(true);
      e.preventDefault();
      rowRef.current.scrollLeft = scrollLeftRef.current - walk;
      updateScrollButtons();
    }
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
    <section ref={sectionRef} className="group/row relative mb-8 sm:mb-12">
      {/* Row Header */}
      <div className="mb-3.5 sm:mb-4 flex items-center justify-between px-4 sm:px-[4.5%]">
        <div className="flex items-center gap-2.5">
          <span className="h-5 sm:h-6 w-1 rounded-full bg-primary" />
          <h2 className="font-display text-lg font-bold sm:text-2xl text-white tracking-tight">{title}</h2>
        </div>
      </div>

      {/* Main Row Container with middle navigation buttons & drag support */}
      <div className="relative">
        {/* Left Arrow Button (desktop hover) */}
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          aria-label={`Cuộn ${title} sang trái`}
          className={cn(
            "hidden sm:grid absolute left-1 sm:left-3 top-[40%] -translate-y-1/2 z-30 size-11 sm:size-13 place-items-center rounded-full bg-black/85 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollLeft
              ? "opacity-0 group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="size-6 sm:size-7 -ml-0.5 text-white" />
        </button>

        {/* Scrollable & Draggable Movie Cards Grid (Roomier card sizes, ~5-6 cards across on desktop) */}
        {hasEnteredViewport ? (
          <div
            ref={rowRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClickCapture={handleClickCapture}
            onScroll={handleScroll}
            className={cn(
              "hide-scrollbar grid grid-flow-col auto-cols-[45vw] xs:auto-cols-[38vw] gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:auto-cols-[28vw] sm:gap-4 sm:px-[4.5%] md:auto-cols-[22vw] lg:auto-cols-[18.5vw] xl:auto-cols-[16vw] 2xl:auto-cols-[14.5vw]",
              isDragging ? "cursor-grabbing select-none" : "cursor-grab",
            )}
          >
            {movies.slice(0, visibleMovieCount).map((movie) => (
              <MovieCard key={movie.id || movie.slug} movie={movie} />
            ))}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="hide-scrollbar grid grid-flow-col auto-cols-[45vw] xs:auto-cols-[38vw] gap-3 overflow-hidden px-4 pb-3 sm:auto-cols-[28vw] sm:gap-4 sm:px-[4.5%] md:auto-cols-[22vw] lg:auto-cols-[18.5vw] xl:auto-cols-[16vw] 2xl:auto-cols-[14.5vw]"
          >
            {movies.slice(0, 10).map((movie, idx) => (
              <div key={movie.id || movie.slug || idx} className="space-y-2">
                <div className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.08]" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        )}

        {/* Right Arrow Button (desktop hover) */}
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          aria-label={`Cuộn ${title} sang phải`}
          className={cn(
            "hidden sm:grid absolute right-1 sm:right-3 top-[40%] -translate-y-1/2 z-30 size-11 sm:size-13 place-items-center rounded-full bg-black/85 hover:bg-primary text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95",
            canScrollRight
              ? "opacity-0 group-hover/row:opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="size-6 sm:size-7 -mr-0.5 text-white" />
        </button>
      </div>
    </section>
  );
}
