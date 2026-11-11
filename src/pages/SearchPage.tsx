import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { MovieCard } from "@/components/MovieCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DemoNotice, RequestError } from "@/components/RequestState";
import type { Movie } from "@/data/movies";
import { isTmdbConfigured, searchMovies } from "@/services/tmdb";

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(input.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchMovies(debouncedQuery, controller.signal)
      .then(setResults)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Có lỗi khi tìm phim.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <main className="min-h-[70vh] px-4 pb-16 pt-24 sm:px-[4.5%]">
      {!isTmdbConfigured && <DemoNotice />}
      <label className="mx-auto mb-10 flex h-12 max-w-2xl items-center gap-3 border-b-2 border-white/60 px-2 focus-within:border-primary">
        <Search className="size-5 shrink-0 text-white/70" />
        <input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tìm tên phim..."
          className="w-full bg-transparent text-lg outline-none placeholder:text-white/45 sm:text-2xl"
        />
      </label>
      {loading && <LoadingSkeleton rows={2} />}
      {error && <RequestError message={error} />}
      {!loading && !error && debouncedQuery && results.length === 0 && (
        <p className="text-center text-sm text-white/65">
          Không tìm thấy phim phù hợp với “{debouncedQuery}”.
        </p>
      )}
      {!loading && !error && results.length > 0 && (
        <section>
          <h1 className="mb-5 text-lg font-semibold">
            Kết quả cho “{debouncedQuery}”
          </h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 xl:grid-cols-7">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
