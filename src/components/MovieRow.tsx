import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

import type { Movie } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";

export function MovieRow({
  title,
  movies,
}: {
  title: string;
  movies: Movie[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  if (!movies.length) return null;

  function scroll(direction: number) {
    rowRef.current?.scrollBy({
      left: direction * (rowRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  return (
    <section className="group/row relative mb-8 sm:mb-10">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-[4.5%]">
        <h2 className="font-display text-base font-semibold sm:text-xl">{title}</h2>
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/row:opacity-100">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Cuộn ${title} sang trái`}
            className="grid size-8 place-items-center rounded bg-black/70 text-white hover:bg-white hover:text-black"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Cuộn ${title} sang phải`}
            className="grid size-8 place-items-center rounded bg-black/70 text-white hover:bg-white hover:text-black"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={rowRef}
        className="hide-scrollbar grid grid-flow-col auto-cols-[38vw] gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:auto-cols-[19vw] sm:gap-3 sm:px-[4.5%] lg:auto-cols-[15vw] xl:auto-cols-[12.5vw]"
      >
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}
