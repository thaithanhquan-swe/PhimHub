import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Film,
  History,
  Play,
  Share2,
  Tv,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { FranchiseSeasonsBar } from "@/components/FranchiseSeasonsBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MovieRow } from "@/components/MovieRow";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { RequestError } from "@/components/RequestState";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { getBackdropUrl, getPosterUrl } from "@/data/movies";
import { cn } from "@/lib/utils";
import {
  getFranchiseParts,
  getMovieDetails,
  type EpisodeItem,
  type EpisodeServer,
  type FranchisePart,
  type MovieDetails,
} from "@/services/movieApi";

export function MovieDetailPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const autoPlay = searchParams.get("play") === "true";

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [franchiseParts, setFranchiseParts] = useState<FranchisePart[]>([]);
  const [error, setError] = useState("");
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const { movies: savedMovies, toggle } = useWatchlist();
  const { saveProgress, getProgress } = useWatchHistory();
  const [resumePrompt, setResumePrompt] = useState<{ currentTime: number; duration: number } | null>(null);
  const [resumeAtTime, setResumeAtTime] = useState(0);
  const [preferEmbed, setPreferEmbed] = useState(false);
  const lastProgressSaveRef = useRef({ episodeKey: "", currentTime: 0 });

  useEffect(() => {
    const controller = new AbortController();
    setMovie(null);
    setFranchiseParts([]);
    setError("");
    setCurrentServerIndex(0);
    setCurrentEpisodeIndex(0);
    setResumePrompt(null);
    setResumeAtTime(0);
    setPreferEmbed(false);

    getMovieDetails(id, controller.signal)
      .then((data) => {
        setMovie(data);

        // Fetch related franchise & season parts in background
        getFranchiseParts(data, controller.signal)
          .then(setFranchiseParts)
          .catch(() => setFranchiseParts([]));

        // Resume from query param or previous watch history
        const paramServer = searchParams.get("server");
        const paramEp = searchParams.get("ep");
        const progress = getProgress(id);

        let sIdx = 0;
        let eIdx = 0;
        let wasResumed = false;

        if (paramServer !== null && paramEp !== null) {
          sIdx = Math.max(0, parseInt(paramServer, 10) || 0);
          eIdx = Math.max(0, parseInt(paramEp, 10) || 0);
          wasResumed = true;
        } else if (progress) {
          sIdx = progress.serverIndex || 0;
          eIdx = progress.episodeIndex || 0;
          wasResumed = true;
        }

        if (data.episodes && data.episodes[sIdx]) {
          setCurrentServerIndex(sIdx);
          if (data.episodes[sIdx].items[eIdx]) {
            setCurrentEpisodeIndex(eIdx);
          }
        }
        const selectedEpisode = data.episodes?.[sIdx]?.items?.[eIdx];
        const hasSavedTime =
          progress &&
          progress.serverIndex === sIdx &&
          progress.episodeIndex === eIdx &&
          (progress.currentTime ?? 0) > 10 &&
          (progress.duration ?? 0) > (progress.currentTime ?? 0) + 15;
        if (selectedEpisode && hasSavedTime) {
          setResumePrompt({
            currentTime: progress.currentTime!,
            duration: progress.duration!,
          });
        }

        if (autoPlay || wasResumed) {
          setTimeout(() => {
            playerRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 450);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không tải được thông tin phim.");
        }
      });

    return () => controller.abort();
  }, [id, autoPlay]);

  const currentServer = movie?.episodes?.[currentServerIndex];
  const currentEpisode = currentServer?.items?.[currentEpisodeIndex];

  const handleProgressUpdate = useCallback((currentTime: number, duration: number) => {
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
  }, [movie, currentServer, currentEpisode, currentServerIndex, currentEpisodeIndex, saveProgress]);

  if (error) {
    return (
      <div className="pt-20">
        <RequestError message={error} />
      </div>
    );
  }

  if (!movie) {
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
    currentEpisodeIndex < currentServer.items.length - 1
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
      <section className="relative min-h-[420px] overflow-hidden sm:min-h-[560px]">
        <img
          src={getBackdropUrl(movie)}
          alt={movie.title}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/85 to-[#141414]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-black/30" />

        <div className="relative z-10 flex min-h-[460px] items-end gap-6 px-4 pb-10 sm:min-h-[560px] sm:px-[4.5%] sm:pb-14">
          <img
            src={getPosterUrl(movie)}
            alt={`Poster phim ${movie.title}`}
            className="hidden w-44 rounded shadow-2xl sm:block lg:w-56 shrink-0 aspect-[2/3] object-cover"
          />

          <div className="max-w-3xl">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white sm:text-sm"
            >
              <ArrowLeft className="size-4" /> Quay lại Trang chủ
            </Link>

            <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {movie.title}
            </h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="mt-1 text-sm font-medium text-white/60 sm:text-lg">
                {movie.originalTitle}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:gap-3 sm:text-sm">
              <span className="rounded bg-primary/90 px-2 py-0.5 font-bold uppercase text-white text-[11px]">
                {movie.quality || "HD"}
              </span>
              <span className="rounded bg-white/15 px-2 py-0.5 text-white text-[11px]">
                {movie.language || "Vietsub"}
              </span>
              <span className="font-semibold text-white">{movie.year}</span>
              <span>·</span>
              <span>{movie.runtime}</span>
              {movie.currentEpisode && (
                <>
                  <span>·</span>
                  <span className="text-white/90 font-medium">{movie.currentEpisode}</span>
                </>
              )}
            </div>

            {/* Genres & Countries */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {movie.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/85"
                >
                  {genre}
                </span>
              ))}
              {movie.countries.map((country: string) => (
                <span
                  key={country}
                  className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/70"
                >
                  {country}
                </span>
              ))}
            </div>

            <p className="mt-4 max-w-2xl text-xs leading-5 text-white/80 sm:text-sm sm:leading-6 line-clamp-3 sm:line-clamp-4">
              {movie.overview}
            </p>

            {/* Franchise / Season Switcher (Hero area) */}
            {franchiseParts.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-white/60 mr-1">Các phần:</span>
                {franchiseParts.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/movie/${p.slug}?play=true`}
                    className={cn(
                      "px-3 py-1.5 min-h-[34px] inline-flex items-center rounded text-xs font-semibold border transition-all active:scale-95",
                      p.isCurrent
                        ? "bg-[#c4ea3b] text-black border-[#c4ea3b] font-bold shadow-md shadow-[#c4ea3b]/25"
                        : "bg-[#1f1f23]/90 text-white/90 border-white/20 hover:border-white/60 hover:bg-white/10",
                    )}
                  >
                    {p.partLabel}
                  </Link>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {hasEpisodes ? (
                <button
                  type="button"
                  onClick={scrollToPlayer}
                  className="inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95"
                >
                  <Play className="size-4 fill-current text-primary" /> Xem phim ngay
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded bg-white/20 px-4 py-2 text-xs text-white/80">
                  <Film className="size-4" /> Đang cập nhật tập
                </span>
              )}

              <button
                type="button"
                onClick={() => toggle(movie)}
                className="inline-flex items-center gap-2 rounded bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 active:scale-95"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="size-4 text-primary" /> Đã lưu
                  </>
                ) : (
                  <>
                    <Bookmark className="size-4" /> Thêm vào danh sách
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded bg-white/10 px-3.5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/20 active:scale-95"
                title="Chia sẻ liên kết phim"
              >
                <Share2 className="size-4" />
                {copied ? <span className="text-xs text-green-400">Đã chép link!</span> : null}
              </button>
            </div>
          </div>
        </div>
      </section>

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
                    onClick={() => {
                      selectEpisode(idx, 0);
                    }}
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

          {/* Native High-Performance Video Player (M3U8 with HLS.js + Embed Fallback) */}
          {hasEpisodes && currentEpisode ? (
            <div>
              <div className="relative">
                <VideoPlayer
                  key={`${movie.slug}-${currentServerIndex}-${currentEpisodeIndex}-${preferEmbed}-${resumeAtTime}`}
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
                {resumePrompt && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="resume-dialog-title"
                    className="absolute inset-0 z-40 grid place-items-center rounded-md bg-black/75 p-4 backdrop-blur-sm"
                  >
                    <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#181818] p-5 text-center text-white shadow-2xl">
                      <History className="mx-auto mb-2 size-6 text-primary" />
                      <h3 id="resume-dialog-title" className="text-sm font-semibold">Bạn đang xem dở</h3>
                      <p className="mt-1 text-xs text-white/65">
                        Đã xem đến {Math.floor(resumePrompt.currentTime / 60)}:
                        {String(Math.floor(resumePrompt.currentTime % 60)).padStart(2, "0")}.
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResumeAtTime(resumePrompt.currentTime);
                            setResumePrompt(null);
                          }}
                          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/80"
                        >
                          Xem tiếp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
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
                          }}
                          className="rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/20"
                        >
                          Xem từ đầu
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                      <span>{preferEmbed ? "▶ Đổi sang: Trực tiếp (HLS)" : "⚡ Đổi sang: Player dự phòng (Embed)"}</span>
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
          <FranchiseSeasonsBar parts={franchiseParts} className="mt-6" />

          {/* Episode Selector */}
          {currentServer && currentServer.items && currentServer.items.length > 0 && (
            <div className="mt-6 rounded-md border border-white/10 bg-[#1a1a1a] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90">
                  Danh sách tập ({currentServer.items.length} tập)
                </h3>
                <span className="text-xs text-white/50">{currentServer.server_name}</span>
              </div>
              <div className="flex max-h-64 flex-wrap gap-1.5 sm:gap-2 overflow-y-auto pr-1">
                {currentServer.items.map((ep: EpisodeItem, idx: number) => {
                  const isActive = idx === currentEpisodeIndex;
                  return (
                    <button
                      key={ep.slug || ep.name}
                      type="button"
                      onClick={() => selectEpisode(currentServerIndex, idx)}
                      className={cn(
                        "min-w-10 sm:min-w-12 min-h-[38px] rounded px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all active:scale-95 inline-flex items-center justify-center",
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                          : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
                      )}
                    >
                      {ep.name.toLowerCase().includes("tập")
                        ? ep.name
                        : ep.name.toLowerCase() === "full"
                          ? "Bản Full"
                          : `Tập ${ep.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cast and Director details */}
          <div className="mt-8 grid grid-cols-1 gap-6 rounded-md border border-white/10 bg-[#181818] p-5 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Đạo diễn
              </h4>
              <p className="mt-1 text-sm text-white/90 font-medium">
                {movie.director || "Đang cập nhật"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Diễn viên
              </h4>
              <p className="mt-1 text-sm text-white/90 leading-6">
                {movie.casts || "Đang cập nhật"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Similar movies recommendations */}
      {movie.recommendations && movie.recommendations.length > 0 && (
        <div className="pt-6">
          <MovieRow title="Phim tương tự" movies={movie.recommendations} />
        </div>
      )}
    </main>
  );
}
