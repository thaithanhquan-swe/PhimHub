import { Film } from "lucide-react";
import { getPosterUrl, type Movie } from "@/data/movies";
import { cn } from "@/lib/utils";

interface SearchSuggestionsListProps {
  id: string;
  suggestions: Movie[];
  activeSuggestionIndex: number;
  onSelect: (movie: Movie) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  className?: string;
}

export function SearchSuggestionsList({
  id,
  suggestions,
  activeSuggestionIndex,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  className,
}: SearchSuggestionsListProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Gợi ý phim"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-[#181818] p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200",
        className,
      )}
    >
      {suggestions.map((movie, index) => (
        <li key={movie.id || movie.slug} role="option" aria-selected={index === activeSuggestionIndex}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(movie)}
            className={cn(
              "flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
              index === activeSuggestionIndex ? "bg-white/15" : "hover:bg-white/10",
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative grid h-14 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10 ring-1 ring-white/10">
                <Film className="size-4 text-white/30" aria-hidden="true" />
                <img
                  src={getPosterUrl(movie)}
                  alt={`Poster ${movie.title}`}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (movie.backdropUrl && target.src !== movie.backdropUrl) {
                      target.src = movie.backdropUrl;
                      return;
                    }
                    target.style.display = "none";
                  }}
                  className="absolute inset-0 size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{movie.title}</span>
                <span className="block truncate text-xs text-white/50">
                  {movie.originalTitle || movie.kind}
                </span>
                {(movie.quality || movie.currentEpisode) && (
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/40">
                    {movie.quality && <span>{movie.quality}</span>}
                    {movie.quality && movie.currentEpisode && <span>·</span>}
                    {movie.currentEpisode && <span className="truncate">{movie.currentEpisode}</span>}
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-xs text-white/50">{movie.year}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
