import {
  Film,
  Tv,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";

import { FranchiseSeasonsBar } from "@/components/FranchiseSeasonsBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieRow } from "@/components/MovieRow";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { RequestError } from "@/components/RequestState";
import {
  EpisodeSelector,
  MovieCastDirector,
  MovieHeroBanner,
  ResumePromptDialog,
} from "@/components/movie-detail";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { getBackdropUrl } from "@/data/movies";
import { useImdbRating } from "@/hooks/useImdbRating";
import { useSyncWatchProgress } from "@/hooks/useSyncWatchProgress";
import { cn } from "@/lib/utils";
import {
  getFranchiseParts,
  getMoviesByCategory,
  getMoviesByGenre,
  getMovieDetails,
  FILTER_OPTIONS,
  type EpisodeServer,
} from "@/services/movieApi";

const VideoPlayer = lazy(() =>
  import("@/components/VideoPlayer").then(({ VideoPlayer }) => ({ default: VideoPlayer })),
);

export function MovieDetailPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoPlay = searchParams.get("play") === "true";
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const { movies: savedMovies, toggle } = useWatchlist();
  const { saveProgress, getProgress } = useWatchHistory();
  const playerRef = useRef<HTMLDivElement>(null);
  const getProgressRef = useRef(getProgress);
  getProgressRef.current = getProgress;
  const [resumePrompt, setResumePrompt] = useState<{ currentTime: number; duration: number } | null>(null);
  const [resumeAtTime, setResumeAtTime] = useState(0);
  const [preferEmbed, setPreferEmbed] = useState(false);
  const lastProgressSaveRef = useRef({ episodeKey: "", currentTime: 0 });

  const movieQuery = useQuery({
    queryKey: ["movie-details", id],
    queryFn: ({ signal }) => getMovieDetails(id, signal),
    enabled: Boolean(id),
  });
  const movie = movieQuery.data ?? null;

  const { onTimeUpdate: syncWatchProgress, error: watchSyncError } = useSyncWatchProgress(
    movie?.id ?? "",
    movie?.title ?? "",
  );
  const initializedIdRef = useRef<string>("");

  const franchiseQuery = useQuery({
    queryKey: ["franchise-parts", movie?.slug],
    queryFn: ({ signal }) => {
      if (!movie) throw new Error("Cannot load franchise parts without a movie.");
      return getFranchiseParts(movie, signal);
    },
    enabled: Boolean(movie),
  });
  const franchiseParts = franchiseQuery.data ?? [];

  const recommendationQuery = useQuery({
    queryKey: ["movie-recommendations", movie?.slug, movie?.genres],
    queryFn: async ({ signal }) => {
      if (!movie) throw new Error("Cannot load recommendations without a movie.");
      const normalize = (value: string) =>
        value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      const genre = FILTER_OPTIONS.genres.find((option) =>
        movie.genres.some((movieGenre) => normalize(movieGenre) === normalize(option.label)),
      );
      const candidates = genre && genre.value !== "all"
        ? await getMoviesByGenre(genre.value, 1, signal)
        : await getMoviesByCategory(movie.kind === "Series" ? "phim-bo" : "phim-le", 1, signal);
      return candidates
        .filter((candidate) => candidate.slug !== movie.slug && candidate.id !== movie.id)
        .slice(0, 18);
    },
    enabled: Boolean(movie),
  });
  const recommendations = recommendationQuery.data ?? movie?.recommendations ?? [];
  const imdb = useImdbRating(movie, true, true);

  const paramServer = searchParams.get("server");
  const paramEp = searchParams.get("ep");

  useEffect(() => {
    if (!movie) return;
    if (initializedIdRef.current === id) return;
    initializedIdRef.current = id;

    setCurrentServerIndex(0);
    setCurrentEpisodeIndex(0);
    setResumePrompt(null);
    setResumeAtTime(0);
    setPreferEmbed(false);

    const progress = getProgressRef.current(id);
    let serverIndex = 0;
    let episodeIndex = 0;
    let wasResumed = false;

    if (paramServer !== null && paramEp !== null) {
      serverIndex = Math.max(0, parseInt(paramServer, 10) || 0);
      episodeIndex = Math.max(0, parseInt(paramEp, 10) || 0);
      wasResumed = true;
    } else if (progress) {
      serverIndex = progress.serverIndex || 0;
      episodeIndex = progress.episodeIndex || 0;
      wasResumed = true;
    }

    if (movie.episodes?.[serverIndex]) {
      setCurrentServerIndex(serverIndex);
      if (movie.episodes[serverIndex].items[episodeIndex]) {
        setCurrentEpisodeIndex(episodeIndex);
      }
    }
    document.title = `${movie.title}${movie.year ? ` (${movie.year})` : ""} - Xem Phim | PhimHub`;
    const selectedEpisode = movie.episodes?.[serverIndex]?.items?.[episodeIndex];
    const hasSavedTime =
      progress &&
      progress.serverIndex === serverIndex &&
      progress.episodeIndex === episodeIndex &&
      (progress.currentTime ?? 0) > 10 &&
      (progress.duration ?? 0) > (progress.currentTime ?? 0) + 15;
    if (selectedEpisode && hasSavedTime) {
      if (autoPlay) {
        setResumeAtTime(progress.currentTime!);
      } else {
        setResumePrompt({
          currentTime: progress.currentTime!,
          duration: progress.duration!,
        });
      }
    }

    if (autoPlay || wasResumed) {
      const timer = window.setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [id, movie, autoPlay, paramServer, paramEp]);

  const currentServer = movie?.episodes?.[currentServerIndex];
  const currentEpisode = currentServer?.items?.[currentEpisodeIndex];

  const handleProgressUpdate = useCallback((currentTime: number, duration: number) => {
    syncWatchProgress(currentTime, duration);
    if (!movie || !currentServer || !currentEpisode || currentTime < 5) return;

    const episodeKey = `${movie.slug}:${currentServerIndex}:${currentEpisodeIndex}`;
    if (lastProgressSaveRef.current.episodeKey !== episodeKey) {
      lastProgressSaveRef.current = { episodeKey, currentTime: 0 };
    }
    if (currentTime - lastProgressSaveRef.current.currentTime < 5) return;

    saveProgress({
      movieId: movie.id,
      slug: movie.slug,
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      serverName: currentServer.server_name,
      serverIndex: currentServerIndex,
      episodeName: currentEpisode.name,
      episodeSlug: currentEpisode.slug,
      episodeIndex: currentEpisodeIndex,
      currentTime,
      duration,
      quality: movie.quality,
      language: movie.language,
    });
    lastProgressSaveRef.current = { episodeKey, currentTime };
  }, [movie, currentServer, currentEpisode, currentServerIndex, currentEpisodeIndex, saveProgress, syncWatchProgress]);

  if (movieQuery.error && !movie) {
    return (
      <div className="pt-20">
        <RequestError
          message={
            movieQuery.error instanceof Error
              ? movieQuery.error.message
              : "Không tải được thông tin phim."
          }
          onRetry={() => void movieQuery.refetch()}
        />
      </div>
    );
  }

  if (movieQuery.isLoading || !movie) {
    return (
      <div className="pt-20">
        <LoadingSkeleton rows={1} />
      </div>
    );
  }

  const isSaved = savedMovies.some((item) => item.id === movie.id || item.slug === movie.slug);
  const hasEpisodes = Boolean(movie.episodes && movie.episodes.length > 0 && currentEpisode);
  const hasNextEpisode = Boolean(
    currentServer &&
    currentServer.items &&
    currentEpisodeIndex < currentServer.items.length - 1,
  );

  function handleNextEpisode() {
    if (hasNextEpisode) {
      selectEpisode(currentServerIndex, currentEpisodeIndex + 1);
    }
  }

  function selectEpisode(serverIndex: number, episodeIndex: number) {
    if (!movie) return;
    const server = movie.episodes?.[serverIndex];
    const episode = server?.items?.[episodeIndex];
    if (!server || !episode) return;

    saveProgress({
      movieId: movie.id,
      slug: movie.slug,
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      serverName: server.server_name,
      serverIndex,
      episodeName: episode.name,
      episodeSlug: episode.slug,
      episodeIndex,
      currentTime: 0,
      duration: 0,
      quality: movie.quality,
      language: movie.language,
    });
    lastProgressSaveRef.current = { episodeKey: `${movie.slug}:${serverIndex}:${episodeIndex}`, currentTime: 0 };
    setCurrentServerIndex(serverIndex);
    setCurrentEpisodeIndex(episodeIndex);
    setResumePrompt(null);
    setResumeAtTime(0);
    setPreferEmbed(false);

    // Keep URL search params in sync with the current episode so F5 refresh preserves this episode
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("server", String(serverIndex));
        next.set("ep", String(episodeIndex));
        return next;
      },
      { replace: true },
    );
  }

  function scrollToPlayer() {
    playerRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <main className="pb-28 lg:pb-16 pt-[62px] sm:pt-[66px] lg:pt-[72px]">
      {/* Banner & Information */}
      <MovieHeroBanner
        movie={movie}
        imdb={imdb}
        franchiseParts={franchiseParts}
        hasEpisodes={hasEpisodes}
        isSaved={isSaved}
        copied={copied}
        onToggleSave={() => toggle(movie)}
        onScrollToPlayer={scrollToPlayer}
        onShare={handleShare}
      />

      {/* Video Player Section */}
      <section ref={playerRef} id="player" className="scroll-mt-20 px-3 sm:px-[4.5%] py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold sm:text-2xl">
                <Tv className="size-5 text-primary" />
                <span>Đang xem: {movie.title}</span>
              </h2>
              {currentEpisode && (
                <p className="mt-1 text-xs text-white/60">
                  {currentServer?.server_name} · {currentEpisode.name.toLowerCase().includes("tập") ? currentEpisode.name : `Tập ${currentEpisode.name}`}
                </p>
              )}
            </div>

            {/* Server tabs */}
            {movie.episodes && movie.episodes.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/60">Máy chủ:</span>
                {movie.episodes.map((server: EpisodeServer, idx: number) => (
                  <button
                    key={server.server_name}
                    type="button"
                    onClick={() => selectEpisode(idx, 0)}
                    className={cn(
                      "rounded px-3 py-1.5 min-h-[36px] text-xs font-semibold transition-all active:scale-95",
                      idx === currentServerIndex
                        ? "bg-primary text-white shadow-md shadow-primary/30"
                        : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
                    )}
                  >
                    {server.server_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Native High-Performance Video Player */}
          {hasEpisodes && currentEpisode ? (
            <div>
              <div className="relative">
                <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-md bg-white/10" />}>
                  <VideoPlayer
                    key={`${movie.slug}-${currentServerIndex}-${preferEmbed}`}
                    m3u8Url={currentEpisode.m3u8}
                    embedUrl={currentEpisode.embed}
                    title={movie.title}
                    episodeName={currentEpisode.name}
                    poster={getBackdropUrl(movie)}
                    autoPlay={!resumePrompt}
                    initialTime={resumeAtTime}
                    hasNextEpisode={hasNextEpisode}
                    onNextEpisode={handleNextEpisode}
                    onTimeUpdate={handleProgressUpdate}
                    preferEmbed={preferEmbed}
                  />
                </Suspense>

                {/* Resume Playback Prompt Dialog */}
                <ResumePromptDialog
                  resumePrompt={resumePrompt}
                  onResume={() => {
                    if (resumePrompt) {
                      setResumeAtTime(resumePrompt.currentTime);
                      setResumePrompt(null);
                    }
                  }}
                  onRestart={() => {
                    if (resumePrompt) {
                      setResumeAtTime(0);
                      setResumePrompt(null);
                      saveProgress({
                        movieId: movie.id,
                        slug: movie.slug,
                        title: movie.title,
                        posterUrl: movie.posterUrl,
                        backdropUrl: movie.backdropUrl,
                        serverName: currentServer?.server_name ?? "",
                        serverIndex: currentServerIndex,
                        episodeName: currentEpisode.name,
                        episodeSlug: currentEpisode.slug,
                        episodeIndex: currentEpisodeIndex,
                        currentTime: 0,
                        duration: resumePrompt.duration,
                        quality: movie.quality,
                        language: movie.language,
                      });
                      lastProgressSaveRef.current = {
                        episodeKey: `${movie.slug}:${currentServerIndex}:${currentEpisodeIndex}`,
                        currentTime: 0,
                      };
                    }
                  }}
                />
              </div>

              {watchSyncError && (
                <p className="mt-2 text-xs text-amber-300" role="status">
                  Không thể đồng bộ tiến trình xem: {watchSyncError}
                </p>
              )}

              {/* Real-time streaming source info with source switcher */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <span>Máy chủ nguồn:</span>
                  <ProviderStatusBadge />
                </div>
                <div className="flex items-center gap-2">
                  {currentEpisode?.embed && (
                    <button
                      type="button"
                      onClick={() => setPreferEmbed((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
                    >
                      <span>{preferEmbed ? "▶ Đổi sang: Trực tiếp (HLS - Không QC)" : "⚡ Đổi sang: Player dự phòng (Embed)"}</span>
                    </button>
                  )}
                  {currentEpisode?.m3u8 && !preferEmbed && (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="hidden sm:inline">Phát trực tiếp HLS</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-md bg-[#1d1d1d] text-center text-white/60">
              <Film className="mb-2 size-10 text-white/40" />
              <p className="text-sm font-medium">Tập phim đang được cập nhật</p>
              <p className="mt-1 text-xs text-white/40">Vui lòng quay lại sau ít phút.</p>
              <div className="mt-3">
                <ProviderStatusBadge />
              </div>
            </div>
          )}

          {/* Franchise / Seasons Switcher Bar */}
          {franchiseParts.length > 0 && <FranchiseSeasonsBar parts={franchiseParts} className="mt-6" />}

          {/* Episode Selector */}
          <EpisodeSelector
            currentServer={currentServer}
            currentEpisodeIndex={currentEpisodeIndex}
            onSelectEpisode={(idx) => selectEpisode(currentServerIndex, idx)}
          />

          {/* Cast and Director details */}
          <MovieCastDirector director={movie.director} casts={movie.casts} />
        </div>
      </section>

      {/* Similar movies recommendations */}
      {recommendations.length > 0 && (
        <div className="pt-6">
          <MovieRow title="Phim tương tự" movies={recommendations} />
        </div>
      )}
      {recommendationQuery.error && recommendations.length === 0 && (
        <RequestError
          message="Không tải được danh sách phim tương tự."
          onRetry={() => void recommendationQuery.refetch()}
        />
      )}
    </main>
  );
}
