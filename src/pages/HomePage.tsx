import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Hero } from "@/components/Hero";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieRow } from "@/components/MovieRow";
import { RequestError } from "@/components/RequestState";
import { useWatchlist } from "@/context/WatchlistContext";
import { getHomeSections, type MovieSection } from "@/services/movieApi";

export function HomePage() {
  const [sections, setSections] = useState<MovieSection[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { movies: savedMovies } = useWatchlist();
  const type = searchParams.get("type");
  const savedOnly = searchParams.get("list") === "saved";

  useEffect(() => {
    const controller = new AbortController();
    setSections(null);
    setError("");
    getHomeSections(controller.signal, type)
      .then(setSections)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Có lỗi khi tải danh sách phim.");
      });
    return () => controller.abort();
  }, [attempt, type]);

  const visibleSections = useMemo(() => {
    if (savedOnly) {
      return [{ title: "Danh sách của tôi", movies: savedMovies }];
    }
    return sections || [];
  }, [savedMovies, savedOnly, sections]);

  // Featured movies for the Hero carousel (top 6 movies from the primary section)
  const featuredMovies = useMemo(() => {
    if (!sections || sections.length === 0) return [];
    return sections[0]?.movies?.slice(0, 6) || [];
  }, [sections]);

  if (!sections && !error && !savedOnly) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="pt-24">
        <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} />
      </div>
    );
  }

  return (
    <main className="pb-16">
      {!savedOnly && featuredMovies.length > 0 && (
        <Hero
          movies={featuredMovies}
          onPlay={(movie) => navigate(`/movie/${movie.slug || movie.id}?play=true`)}
        />
      )}

      {savedOnly && (
        <div className="px-4 pt-28 sm:px-[4.5%]">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Danh sách phim đã lưu</h1>
          {savedMovies.length === 0 && (
            <p className="mt-4 text-sm text-white/60">
              Bạn chưa lưu bộ phim nào. Hãy bấm biểu tượng lưu trên các phim bạn yêu thích!
            </p>
          )}
        </div>
      )}

      <div className={savedOnly ? "mt-6" : "relative z-10 -mt-8 sm:-mt-12"}>
        {visibleSections.map((section) => (
          <MovieRow
            key={section.title}
            title={section.title}
            movies={section.movies}
          />
        ))}
      </div>
    </main>
  );
}
