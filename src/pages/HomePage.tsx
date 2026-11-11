import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Hero } from "@/components/Hero";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieRow } from "@/components/MovieRow";
import { DemoNotice, RequestError } from "@/components/RequestState";
import { movies as mockMovies } from "@/data/movies";
import { useWatchlist } from "@/context/WatchlistContext";
import {
  getHomeSections,
  isTmdbConfigured,
  type MovieSection,
} from "@/services/tmdb";

export function HomePage() {
  const [sections, setSections] = useState<MovieSection[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { movies: savedMovies } = useWatchlist();
  const type = searchParams.get("type");
  const savedOnly = searchParams.get("list") === "saved";
  const heroMovie = sections?.[0]?.movies[0] ?? mockMovies[0];

  useEffect(() => {
    const controller = new AbortController();
    setSections(null);
    setError("");
    getHomeSections(controller.signal, type === "tv" ? "tv" : "movie")
      .then(setSections)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Có lỗi khi tải phim.");
      });
    return () => controller.abort();
  }, [attempt, type]);

  const visibleSections = useMemo(() => {
    if (!sections) return [];
    if (type === "movie") {
      return sections;
    }
    if (savedOnly) return [{ title: "Danh sách của tôi", movies: savedMovies }];
    return sections;
  }, [savedMovies, savedOnly, sections, type]);

  if (!sections && !error) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="pt-16">
        <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} />
        {!isTmdbConfigured && <DemoNotice />}
      </div>
    );
  }

  return (
    <>
      {!savedOnly && <Hero movie={heroMovie} onPlay={() => navigate(`/movie/${heroMovie.id}`)} />}
      {!isTmdbConfigured && <DemoNotice />}
      <div className="relative z-10 -mt-10 sm:-mt-12">
        {visibleSections.map((section) => (
          <MovieRow
            key={section.title}
            title={section.title}
            movies={section.movies}
          />
        ))}
      </div>
    </>
  );
}
