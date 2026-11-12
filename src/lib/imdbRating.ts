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

function matchesMovie(meta: CinemetaMeta, movie: Movie): boolean {
  const sourceTitles = [movie.originalTitle, movie.title]
    .filter((title): title is string => Boolean(title))
    .map(normalizeTitle);
  const candidateTitle = normalizeTitle(meta.name ?? "");
  const candidateYear = getYear(meta.releaseInfo) ?? getYear(meta.year);

  return sourceTitles.includes(candidateTitle) && candidateYear === movie.year;
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
      const query = [title, movie.year].join(" ");
      const catalogUrl =
        `${CINEMETA_BASE_URL}/catalog/${type}/top/` +
        `search=${encodeURIComponent(query)}.json`;
      const catalog = await fetchJson<{ metas?: CinemetaMeta[] }>(catalogUrl);
      const match = catalog.metas?.find((meta) => matchesMovie(meta, movie));
      imdbId = match?.imdb_id || match?.id;
      if (imdbId) break;
    }
  }

  if (!imdbId || !IMDB_ID_PATTERN.test(imdbId)) return null;

  const metadata = await fetchJson<{ meta?: CinemetaMeta }>(
    `${CINEMETA_BASE_URL}/meta/${type}/${imdbId}.json`,
  );
  const rating = parseImdbRating(metadata.meta?.imdbRating);
  const trailerId = metadata.meta?.trailers
    ?.find((trailer) => trailer.type?.toLowerCase() === "trailer" && /^[\w-]{11}$/.test(trailer.source ?? ""))
    ?.source;
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
