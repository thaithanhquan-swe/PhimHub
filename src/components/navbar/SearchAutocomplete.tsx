import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SearchSuggestionsList } from "@/components/navbar/SearchSuggestionsList";
import { searchMovies } from "@/services/movieApi";

export function SearchAutocomplete() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNavbarSuggestions, setShowNavbarSuggestions] = useState(false);
  const [isHoveringNavbarSuggestions, setIsHoveringNavbarSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const navigate = useNavigate();

  const suggestionQuery = useQuery({
    queryKey: ["movie-search", debouncedQuery],
    queryFn: ({ signal }) => searchMovies(debouncedQuery, 1, signal),
    enabled: searchFocused && debouncedQuery.length >= 2,
  });

  const suggestions =
    searchFocused && showNavbarSuggestions && query.trim() === debouncedQuery
      ? (suggestionQuery.data ?? []).slice(0, 5)
      : [];

  // Tự động ẩn dropdown gợi ý sau khoảng 3.5 giây nếu người dùng không tương tác
  useEffect(() => {
    if (!showNavbarSuggestions || !searchFocused) return;
    if (isHoveringNavbarSuggestions) return;

    const timer = window.setTimeout(() => {
      setShowNavbarSuggestions(false);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [showNavbarSuggestions, searchFocused, debouncedQuery, suggestionQuery.data, isHoveringNavbarSuggestions]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    const selected = suggestions[activeSuggestionIndex];
    if (selected) {
      navigate(`/movie/${selected.slug || selected.id}`);
      setQuery("");
      setSearchFocused(false);
      setShowNavbarSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setQuery("");
      setSearchFocused(false);
      setShowNavbarSuggestions(false);
    }
  }

  return (
    <form onSubmit={submitSearch} className="relative flex-1 min-w-[95px] sm:min-w-[140px]">
      <div className="relative flex h-9 sm:h-10 w-full items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 sm:px-4 backdrop-blur-md transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 focus-within:bg-black/80">
        <Search className="size-3.5 sm:size-4 shrink-0 text-white/70" />
        <input
          value={query}
          onChange={(event) => {
            const val = event.target.value;
            setQuery(val);
            setActiveSuggestionIndex(-1);
            if (val.trim().length >= 2) {
              setShowNavbarSuggestions(true);
            } else {
              setShowNavbarSuggestions(false);
            }
          }}
          onFocus={() => {
            setSearchFocused(true);
            if (query.trim().length >= 2) {
              setShowNavbarSuggestions(true);
            }
          }}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length > 0) {
              event.preventDefault();
              setShowNavbarSuggestions(true);
              setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp" && suggestions.length > 0) {
              event.preventDefault();
              setShowNavbarSuggestions(true);
              setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
            } else if (event.key === "Escape") {
              setSearchFocused(false);
              setShowNavbarSuggestions(false);
              setActiveSuggestionIndex(-1);
            }
          }}
          placeholder="Tìm phim..."
          aria-label="Tìm phim"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls="navbar-search-suggestions"
          role="combobox"
          className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-white/45 text-white pr-1"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setShowNavbarSuggestions(false);
            }}
            className="grid size-5 place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Xóa từ khóa"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <SearchSuggestionsList
          id="navbar-search-suggestions"
          suggestions={suggestions}
          activeSuggestionIndex={activeSuggestionIndex}
          onMouseEnter={() => setIsHoveringNavbarSuggestions(true)}
          onMouseLeave={() => setIsHoveringNavbarSuggestions(false)}
          onSelect={(movie) => {
            navigate(`/movie/${movie.slug || movie.id}`);
            setQuery("");
            setSearchFocused(false);
            setShowNavbarSuggestions(false);
            setActiveSuggestionIndex(-1);
          }}
          className="absolute right-0 top-full z-[60] mt-2 w-[min(90vw,26rem)]"
        />
      )}
    </form>
  );
}
