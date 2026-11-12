import type { Movie } from "@/data/movies";
import { parseImdbRating } from "@/lib/imdb";

type CinemetaMeta = {
  id?: string;
  imdb_id?: string;
  imdbRating?: string | number;
  name?: string;
  releaseInfo?: string;
  trailers?: { source?: string; type?: string }[];
  year?: string | number;
};

type ImdbMetadata = {
  imdbId?: string;
  rating?: number;
  trailerId?: string;
};

type CachedRating = {
  value: ImdbMetadata | null;
  expiresAt: number;
};

const CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io";
const IMDB_ID_PATTERN = /^tt\d{5,12}$/;
const RATING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

const ratingCache = new Map<string, CachedRating>();
const inFlightRatings = new Map<string, Promise<ImdbMetadata | null>>();

function getYear(value?: string | number): number | undefined {
  const match = String(value ?? "").match(/\b(18|19|20|21)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function matchesMovie(meta: CinemetaMeta, movie: Movie, strictYear = true): boolean {
  const sourceTitles = [movie.originalTitle, movie.title]
    .filter((title): title is string => Boolean(title))
    .map(normalizeTitle);
  const candidateTitle = normalizeTitle(meta.name ?? "");
  const candidateYear = getYear(meta.releaseInfo) ?? getYear(meta.year);

  if (!sourceTitles.includes(candidateTitle)) return false;
  if (strictYear) return candidateYear === movie.year;
  return !candidateYear || Math.abs(candidateYear - movie.year) <= 3;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`IMDb rating request failed with HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchMetadata(movie: Movie): Promise<ImdbMetadata | null> {
  const type = movie.kind === "Series" ? "series" : "movie";
  let imdbId = movie.imdbId;

  if (!imdbId || !IMDB_ID_PATTERN.test(imdbId)) {
    const titles = [
      ...new Set([movie.originalTitle, movie.title].filter((title): title is string => Boolean(title))),
    ];
    for (const title of titles) {
      // 1. Search with title and year for strict match
      const query = [title, movie.year].join(" ");
      const catalogUrl =
        `${CINEMETA_BASE_URL}/catalog/${type}/top/` +
        `search=${encodeURIComponent(query)}.json`;
      let catalog = await fetchJson<{ metas?: CinemetaMeta[] }>(catalogUrl).catch(() => ({ metas: [] }));
      let match = catalog.metas?.find((meta) => matchesMovie(meta, movie, true));

      // 2. Fallback to title search if year differs slightly (e.g. upload year vs theatrical release)
      if (!match) {
        const titleOnlyUrl =
          `${CINEMETA_BASE_URL}/catalog/${type}/top/` +
          `search=${encodeURIComponent(title)}.json`;
        catalog = await fetchJson<{ metas?: CinemetaMeta[] }>(titleOnlyUrl).catch(() => ({ metas: [] }));
        match = catalog.metas?.find((meta) => matchesMovie(meta, movie, false));
      }

      imdbId = match?.imdb_id || match?.id;
      if (imdbId) break;
    }
  }

  if (!imdbId || !IMDB_ID_PATTERN.test(imdbId)) return null;

  const metadata = await fetchJson<{ meta?: CinemetaMeta }>(
    `${CINEMETA_BASE_URL}/meta/${type}/${imdbId}.json`,
  );
  const rating = parseImdbRating(metadata.meta?.imdbRating);
  const rawTrailers = metadata.meta?.trailers ?? [];
  const trailerFromList = rawTrailers.find((t) => t.source && /^[\w-]{11}$/.test(t.source))?.source;
  const rawSingleTrailer = (metadata.meta as { trailer?: string })?.trailer;
  const singleTrailerId =
    rawSingleTrailer && /^[\w-]{11}$/.test(rawSingleTrailer)
      ? rawSingleTrailer
      : rawSingleTrailer?.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];
  const trailerId = trailerFromList || singleTrailerId;

  return {
    imdbId,
    ...(rating !== undefined ? { rating } : {}),
    ...(trailerId ? { trailerId } : {}),
  };
}

export function getImdbMetadata(movie: Movie): Promise<ImdbMetadata | null> {
  const key = [
    movie.kind === "Series" ? "series" : "movie",
    movie.imdbId || normalizeTitle(movie.originalTitle || movie.title),
    movie.year,
  ].join(":");
  const cached = ratingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);

  const inFlight = inFlightRatings.get(key);
  if (inFlight) return inFlight;

  const request = fetchMetadata(movie)
    .then((value) => {
      ratingCache.set(key, {
        value,
        expiresAt: Date.now() + (value?.rating !== undefined ? RATING_CACHE_TTL_MS : EMPTY_CACHE_TTL_MS),
      });
      return value;
    })
    .finally(() => inFlightRatings.delete(key));

  inFlightRatings.set(key, request);
  return request;
}
