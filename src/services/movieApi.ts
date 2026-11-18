import type { EpisodeServer, Movie, MovieDetails } from "@/data/movies";
import { parseImdbRating } from "@/lib/imdb";

export type { EpisodeItem, EpisodeServer, Movie, MovieDetails } from "@/data/movies";

export type ApiProviderId = "phimapi" | "nguonc";

export type ProviderStatus = {
  id: ApiProviderId;
  name: string;
  baseUrl: string;
  description: string;
  isActive: boolean;
  status: "unknown" | "online" | "degraded" | "offline";
  lastError?: string;
  lastChecked?: number;
};

export type MovieSection = {
  title: string;
  movies: Movie[];
  slug?: string;
  viewAllUrl?: string;
};

export type FilterParams = {
  type?: string; // "tv" | "movie" | "hoat-hinh" | "tv-shows" | "all"
  genre?: string;
  country?: string;
  year?: string | number;
  imdb?: string | number;
  page?: number;
};

export type FilterResult = {
  movies: Movie[];
  currentPage: number;
  totalPage: number;
  totalItems: number;
  provider: ApiProviderId;
};

// Provider endpoints configuration
const PROVIDER_CONFIGS: Record<
  ApiProviderId,
  { name: string; baseUrl: string; description: string; cdnImage: string }
> = {
  phimapi: {
    name: "PhimAPI (KKPhim)",
    baseUrl: "https://phimapi.com",
    description: "Nguồn chính: Tốc độ cao, stream m3u8 và player nhúng hoạt động 100%",
    cdnImage: "https://phimimg.com",
  },
  nguonc: {
    name: "NguonC",
    baseUrl: "https://phim.nguonc.com/api",
    description: "Nguồn dự phòng: Tự động kích hoạt khi nguồn chính gặp sự cố",
    cdnImage: "https://phim.nguonc.com",
  },
};

// Current active provider (PhimAPI is the rock-solid primary)
const STORAGE_KEY = "phimhub_active_provider";
let activeProvider: ApiProviderId = "phimapi";

// Reset stuck nguonc from previous sessions to ensure fast, reliable primary
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "phimapi") {
      activeProvider = "phimapi";
    } else if (saved === "nguonc") {
      localStorage.removeItem(STORAGE_KEY);
      activeProvider = "phimapi";
    }
  } catch {
    // Ignore storage errors
  }
}

const providerHealth: Record<ApiProviderId, Pick<ProviderStatus, "status" | "lastError" | "lastChecked">> = {
  phimapi: { status: "unknown", lastChecked: 0 },
  nguonc: { status: "unknown", lastChecked: 0 },
};

// Listeners for real-time UI status updates
type ProviderChangeListener = (provider: ApiProviderId, health: Record<ApiProviderId, ProviderStatus>) => void;
const listeners = new Set<ProviderChangeListener>();

export function getActiveProvider(): ApiProviderId {
  return activeProvider;
}

export function setActiveProvider(newProvider: ApiProviderId): void {
  if (activeProvider !== newProvider) {
    activeProvider = newProvider;
    notifyListeners();
  }
}

function updateProviderHealth(
  provider: ApiProviderId,
  status: ProviderStatus["status"],
  lastError?: string,
): void {
  providerHealth[provider] = {
    status,
    lastError,
    lastChecked: Date.now(),
  };
  notifyListeners();
}

export function getProvidersStatus(): ProviderStatus[] {
  return (["phimapi", "nguonc"] as ApiProviderId[]).map((id) => {
    const config = PROVIDER_CONFIGS[id];
    const health = providerHealth[id];
    return {
      id,
      name: config.name,
      baseUrl: config.baseUrl,
      description: config.description,
      isActive: activeProvider === id,
      status: health.status,
      lastError: health.lastError,
      lastChecked: health.lastChecked,
    };
  });
}

export function subscribeProviderChange(listener: ProviderChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const currentStatusMap = (["phimapi", "nguonc"] as ApiProviderId[]).reduce(
    (acc, id) => {
      acc[id] = {
        id,
        name: PROVIDER_CONFIGS[id].name,
        baseUrl: PROVIDER_CONFIGS[id].baseUrl,
        description: PROVIDER_CONFIGS[id].description,
        isActive: activeProvider === id,
        status: providerHealth[id].status,
        lastError: providerHealth[id].lastError,
        lastChecked: providerHealth[id].lastChecked,
      };
      return acc;
    },
    {} as Record<ApiProviderId, ProviderStatus>,
  );

  listeners.forEach((fn) => {
    try {
      fn(activeProvider, currentStatusMap);
    } catch (e) {
      console.error("Provider listener error:", e);
    }
  });
}

// In-memory cache
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function normalizeImageUrl(url?: string | null, fallbackDomain = "https://phimimg.com"): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `${fallbackDomain.replace(/\/+$/, "")}/${cleanPath}`;
}

// Low-level fetcher
async function fetchJson<T>(url: string, signal?: AbortSignal, timeoutMs = 8000): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  // Link signal if provided
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} từ ${url}`);
    }

    const data = (await res.json()) as T;
    cache.set(url, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

let consecutivePrimaryFailures = 0;

// Generic failover executor: Tries primary, on error automatically falls back to secondary
async function executeWithFailover<T>(
  operation: (provider: ApiProviderId) => Promise<T>,
): Promise<{ data: T; provider: ApiProviderId }> {
  const primary = activeProvider;
  const fallback: ApiProviderId = primary === "phimapi" ? "nguonc" : "phimapi";

  try {
    const data = await operation(primary);
    updateProviderHealth(primary, "online");
    consecutivePrimaryFailures = 0;
    return { data, provider: primary };
  } catch (primaryErr) {
    // CRITICAL: If aborted by React unmount / page navigation, do NOT treat as provider failure!
    if (primaryErr instanceof Error && (primaryErr.name === "AbortError" || primaryErr.message.includes("aborted"))) {
      throw primaryErr;
    }

    const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[Failover] Nguồn ${PROVIDER_CONFIGS[primary].name} gặp sự cố (${errMsg}). Tự động luân phiên sang ${PROVIDER_CONFIGS[fallback].name}...`);

    updateProviderHealth(primary, "degraded", errMsg);
    consecutivePrimaryFailures++;

    try {
      const data = await operation(fallback);
      updateProviderHealth(fallback, "online");
      
      // Only switch global default provider if primary fails 3 times consecutively
      if (consecutivePrimaryFailures >= 3) {
        setActiveProvider(fallback);
      }
      return { data, provider: fallback };
    } catch (fallbackErr) {
      if (fallbackErr instanceof Error && (fallbackErr.name === "AbortError" || fallbackErr.message.includes("aborted"))) {
        throw fallbackErr;
      }
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      updateProviderHealth(fallback, "offline", fallbackMsg);
      throw new Error(
        `Cả hai nguồn phim (${PROVIDER_CONFIGS[primary].name}: ${errMsg}; ${PROVIDER_CONFIGS[fallback].name}: ${fallbackMsg}) đều không phản hồi.`,
      );
    }
  }
}

// -------------------------------------------------------------
// Data Mappers: PhimAPI & NguonC
// -------------------------------------------------------------

// PhimAPI Types
type PhimApiItem = {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  type?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  time?: string | null;
  episode_current?: string;
  quality?: string;
  lang?: string;
  content?: string;
  actor?: string[] | string;
  director?: string[] | string;
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
  status?: string;
  imdb?: string | {
    id?: string | null;
    url?: string | null;
    rating?: string | number | null;
    vote_average?: string | number | null;
    vote_count?: number | null;
  };
  imdb_rating?: string | number | null;
  trailer_url?: string | null;
};

type PhimApiListResponse = {
  status: boolean | string;
  items?: PhimApiItem[];
  data?: {
    items: PhimApiItem[];
    params?: {
      pagination?: {
        totalItems: number;
        totalItemsPerPage: number;
        currentPage: number;
        totalPages: number;
      };
    };
    APP_DOMAIN_CDN_IMAGE?: string;
  };
  pagination?: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
};

type PhimApiDetailResponse = {
  status: boolean | string;
  movie?: PhimApiItem & {
    content?: string;
    showtimes?: string;
    trailer_url?: string;
  };
  episodes?: {
    server_name: string;
    server_data: {
      name: string;
      slug: string;
      filename: string;
      link_embed: string;
      link_m3u8: string;
    }[];
  }[];
};

// NguonC Types
type NguonCMovieItem = {
  id?: string;
  name: string;
  original_name?: string;
  slug: string;
  year?: string | number;
  description?: string;
  total_episodes?: number;
  current_episode?: string;
  time?: string | null;
  quality?: string;
  language?: string;
  director?: string | null;
  casts?: string | null;
  thumb_url?: string;
  thumb_url_webp?: string;
  poster_url?: string;
  poster_url_webp?: string;
  category?: Record<
    string,
    {
      group: { id: string; name: string };
      list: { id: string; name: string }[];
    }
  >;
  tmdb?: { id: number | null; type: string | null; season: number | null; url: string | null };
  imdb?: {
    id: string | null;
    url: string | null;
    rating?: string | number | null;
    vote_average?: string | number | null;
    vote_count?: number | null;
  };
};

type NguonCListResponse = {
  status: string;
  paginate?: {
    current_page: number;
    total_page: number;
    total_items: number;
    items_per_page: number;
  };
  items: NguonCMovieItem[];
};

type NguonCDetailResponse = {
  status: string;
  movie: NguonCMovieItem & {
    episodes?: EpisodeServer[];
  };
};

export function mapPhimApiMovie(item: PhimApiItem, cdnDomain = "https://phimimg.com"): Movie {
  const poster = normalizeImageUrl(item.thumb_url || item.poster_url, cdnDomain);
  const backdrop = normalizeImageUrl(item.poster_url || item.thumb_url, cdnDomain);

  const yearNum = typeof item.year === "string" ? parseInt(item.year, 10) : item.year;
  const isSeries = item.type === "series" || (item.episode_current && !item.episode_current.toLowerCase().includes("full"));

  const quality = item.quality || "FHD";
  const language = item.lang || "Vietsub";

  const cleanDesc = (item.content || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  const director = Array.isArray(item.director)
    ? item.director.filter((d) => d && d !== "Đang cập nhật").join(", ")
    : item.director;

  const casts = Array.isArray(item.actor)
    ? item.actor.filter((a) => a && a !== "Đang cập nhật").join(", ")
    : item.actor;
  const imdbId = typeof item.imdb === "string" ? item.imdb : item.imdb?.id || undefined;
  const imdbUrl = typeof item.imdb === "object" ? item.imdb?.url || undefined : undefined;
  const rawImdbRating =
    item.imdb_rating ??
    (typeof item.imdb === "object"
      ? (item.imdb?.vote_average && Number(item.imdb.vote_average) > 0
          ? item.imdb.vote_average
          : item.imdb?.rating)
      : undefined);
  const imdbRating = parseImdbRating(rawImdbRating);

  const categories = Array.isArray(item.category)
    ? item.category.map((c) => c.name).filter(Boolean)
    : [];
  const countries = Array.isArray(item.country)
    ? item.country.map((c) => c.name).filter(Boolean)
    : [];

  const genreText = categories.slice(0, 3).join(", ");
  const countryText = countries.slice(0, 2).join(", ");

  const fallbackSummary =
    [
      item.origin_name && item.origin_name !== item.name ? item.origin_name : "",
      genreText,
      countryText,
      item.episode_current ? `Tình trạng: ${item.episode_current}` : "",
    ]
      .filter(Boolean)
      .join(" · ") ||
    `${item.name} (${yearNum || new Date().getFullYear()}) - Phim ${isSeries ? "bộ" : "lẻ"} ${quality} ${language} trên PhimHub.`;

  return {
    id: item.slug,
    slug: item.slug,
    title: item.name || item.origin_name || "Chưa có tên",
    originalTitle: item.origin_name || undefined,
    year: isNaN(yearNum as number) || !yearNum ? new Date().getFullYear() : (yearNum as number),
    rating: quality,
    genre: `${quality} · ${language}`,
    kind: isSeries ? "Series" : "Phim lẻ",
    badge: item.episode_current || quality,
    image: poster,
    posterUrl: poster,
    backdropUrl: backdrop,
    description: cleanDesc || fallbackSummary,
    runtime: item.time || (isSeries ? "Đang chiếu" : "Bản đẹp"),
    quality,
    language,
    currentEpisode: item.episode_current || "FULL",
    totalEpisodes: isSeries ? 0 : 1,
    director: director || undefined,
    casts: casts || undefined,
    imdbId,
    imdbUrl,
    imdbRating,
    trailerUrl: item.trailer_url?.trim() || undefined,
  };
}

export function mapNguonCMovie(item: NguonCMovieItem): Movie {
  const cleanDesc = (item.description || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  const totalEp = Number(item.total_episodes) || 1;
  const isSeries =
    totalEp > 1 ||
    Boolean(
      item.current_episode &&
        !item.current_episode.toLowerCase().includes("full") &&
        item.current_episode.toLowerCase().includes("tập"),
    );

  const poster =
    item.thumb_url?.trim() ||
    item.thumb_url_webp?.trim() ||
    item.poster_url?.trim() ||
    item.poster_url_webp?.trim() ||
    "";

  const backdrop =
    item.poster_url?.trim() ||
    item.poster_url_webp?.trim() ||
    item.thumb_url?.trim() ||
    item.thumb_url_webp?.trim() ||
    "";

  const yearNum = typeof item.year === "string" ? parseInt(item.year, 10) : item.year;
  const quality = item.quality || "HD";
  const language = item.language || "Vietsub";
  const rawNguonCRating =
    item.imdb?.rating ??
    (item.imdb as { vote_average?: string | number } | undefined)?.vote_average;
  const imdbRating = parseImdbRating(rawNguonCRating);
  const imdbId =
    item.imdb?.id ||
    (item.imdb?.url ? item.imdb.url.match(/(tt\d{5,12})/)?.[1] : undefined);

  const fallbackNguonCSummary =
    [
      item.original_name && item.original_name !== item.name ? item.original_name : "",
      quality && language ? `${quality} · ${language}` : "",
      item.current_episode ? `Tình trạng: ${item.current_episode}` : "",
    ]
      .filter(Boolean)
      .join(" · ") ||
    `${item.name} (${yearNum || new Date().getFullYear()}) - Phim ${isSeries ? "bộ" : "lẻ"} ${quality} ${language} trên PhimHub.`;

  return {
    id: item.slug,
    slug: item.slug,
    title: item.name || item.original_name || "Chưa có tên",
    originalTitle: item.original_name || undefined,
    year: isNaN(yearNum as number) || !yearNum ? new Date().getFullYear() : (yearNum as number),
    rating: quality,
    genre: `${quality} · ${language}`,
    kind: isSeries ? "Series" : "Phim lẻ",
    badge: item.current_episode || quality,
    image: poster,
    posterUrl: poster,
    backdropUrl: backdrop,
    description: cleanDesc || fallbackNguonCSummary,
    runtime: item.time || (isSeries ? `${totalEp} tập` : "Bản đẹp"),
    quality,
    language,
    currentEpisode: item.current_episode || "FULL",
    totalEpisodes: totalEp,
    director: item.director || undefined,
    casts: item.casts || undefined,
    imdbId: imdbId || undefined,
    imdbUrl: item.imdb?.url || undefined,
    imdbRating,
  };
}

// -------------------------------------------------------------
// Slug compatibility helpers between PhimAPI & NguonC
// -------------------------------------------------------------
function toPhimApiGenreSlug(slug: string): string {
  if (slug === "hai" || slug === "phim-hai") return "hai-huoc";
  if (slug === "khoa-hoc-vien-tuong") return "vien-tuong";
  if (slug === "gay-can") return "bi-an";
  return slug;
}

function toNguonCGenreSlug(slug: string): string {
  if (slug === "hai-huoc" || slug === "hai") return "phim-hai";
  if (slug === "vien-tuong") return "khoa-hoc-vien-tuong";
  return slug;
}

function toPhimApiCountrySlug(slug: string): string {
  if (slug === "my") return "au-my";
  return slug;
}

function toNguonCCountrySlug(slug: string): string {
  if (slug === "au-my") return "my";
  return slug;
}

// -------------------------------------------------------------
// Public Movie API Methods with Automatic Failover
// -------------------------------------------------------------

export async function getNewUpdatedMovies(page = 1, signal?: AbortSignal): Promise<Movie[]> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`,
        signal,
      );
      const items = data.items || data.data?.items || [];
      return items.map((m) => mapPhimApiMovie(m));
    } else {
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function getMoviesByCategory(
  categorySlug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      // phim-bo, phim-le, hoat-hinh, tv-shows
      const slug =
        categorySlug === "tv"
          ? "phim-bo"
          : categorySlug === "movie"
            ? "phim-le"
            : categorySlug;
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/v1/api/danh-sach/${slug}?page=${page}`,
        signal,
      );
      const items = data.data?.items || data.items || [];
      return items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
    } else {
      const slug =
        categorySlug === "tv"
          ? "phim-bo"
          : categorySlug === "movie"
            ? "phim-le"
            : categorySlug;
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/danh-sach/${slug}?page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function getMoviesByGenre(
  genreSlug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const slug = toPhimApiGenreSlug(genreSlug);
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/v1/api/the-loai/${slug}?page=${page}`,
        signal,
      );
      const items = data.data?.items || data.items || [];
      return items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
    } else {
      const slug = toNguonCGenreSlug(genreSlug);
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/the-loai/${slug}?page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function getMoviesByCountry(
  countrySlug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const slug = toPhimApiCountrySlug(countrySlug);
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/v1/api/quoc-gia/${slug}?page=${page}`,
        signal,
      );
      const items = data.data?.items || data.items || [];
      return items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
    } else {
      const slug = toNguonCCountrySlug(countrySlug);
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/quoc-gia/${slug}?page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function getMoviesByYear(
  year: number,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/v1/api/nam-phat-hanh/${year}?page=${page}`,
        signal,
      );
      const items = data.data?.items || data.items || [];
      return items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
    } else {
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/nam-phat-hanh/${year}?page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function searchMovies(
  keyword: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  if (!keyword.trim()) return [];

  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const data = await fetchJson<PhimApiListResponse>(
        `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`,
        signal,
      );
      const items = data.data?.items || data.items || [];
      return items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
    } else {
      const data = await fetchJson<NguonCListResponse>(
        `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`,
        signal,
      );
      return (data.items || []).map(mapNguonCMovie);
    }
  });

  return result.data;
}

export async function getMovieDetails(slug: string, signal?: AbortSignal): Promise<MovieDetails> {
  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      const data = await fetchJson<PhimApiDetailResponse>(`https://phimapi.com/phim/${slug}`, signal);
      if (!data.movie) {
        throw new Error("Không tìm thấy thông tin phim trên PhimAPI.");
      }

      const raw = data.movie;
      const baseMovie = mapPhimApiMovie(raw);

      const genres = (raw.category || []).map((c) => c.name);
      const countries = (raw.country || []).map((c) => c.name);

      const episodes: EpisodeServer[] = (data.episodes || []).map((server) => ({
        server_name: server.server_name || "Vietsub",
        items: (server.server_data || []).map((ep) => ({
          name: ep.name || "Tập 1",
          slug: ep.slug || String(ep.name),
          embed: ep.link_embed || (ep.link_m3u8 ? `https://player.phimapi.com/player/?url=${encodeURIComponent(ep.link_m3u8)}` : ""),
          m3u8: ep.link_m3u8 || undefined,
        })),
      }));

      return {
        ...baseMovie,
        overview: baseMovie.description,
        genres: genres.length > 0 ? genres : [baseMovie.genre],
        countries,
        episodes,
        recommendations: [],
        trailerUrl: raw.trailer_url?.trim() || baseMovie.trailerUrl,
      };
    } else {
      const data = await fetchJson<NguonCDetailResponse>(`https://phim.nguonc.com/api/film/${slug}`, signal);
      if (!data.movie || data.status !== "success") {
        throw new Error("Không tìm thấy thông tin phim trên NguonC.");
      }

      const raw = data.movie;
      const baseMovie = mapNguonCMovie(raw);

      const genres: string[] = [];
      const countries: string[] = [];
      if (raw.category && typeof raw.category === "object") {
        Object.values(raw.category).forEach((cat) => {
          (cat.list || []).forEach((entry) => {
            if (entry.name) genres.push(entry.name);
          });
        });
      }

      return {
        ...baseMovie,
        overview: baseMovie.description,
        genres: genres.length > 0 ? genres : [baseMovie.genre],
        countries,
        episodes: raw.episodes || [],
        recommendations: [],
      };
    }
  });

  return result.data;
}

export async function getTopImdbMovies(
  type: "movie" | "tv",
  count = 14,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const categorySlug = type === "tv" ? "phim-bo" : "phim-le";
  try {
    const [page1, page2, page3] = await Promise.all([
      getMoviesByCategory(categorySlug, 1, signal).catch(() => [] as Movie[]),
      getMoviesByCategory(categorySlug, 2, signal).catch(() => [] as Movie[]),
      getMoviesByCategory(categorySlug, 3, signal).catch(() => [] as Movie[]),
    ]);
    const all = [...page1, ...page2, ...page3];
    const seen = new Set<string>();
    const unique = all.filter((m) => {
      const key = m.slug || m.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const rated = unique.filter(
      (m) => m.imdbRating !== undefined && m.imdbRating >= 7.0,
    );

    if (rated.length >= 6) {
      return rated
        .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0))
        .slice(0, count);
    }

    return unique
      .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0))
      .slice(0, count);
  } catch (error) {
    console.error(`Failed to fetch top IMDb ${type}:`, error);
    return [];
  }
}

export async function getHomeSections(
  signal?: AbortSignal,
  type?: string | null,
): Promise<MovieSection[]> {
  type SectionConfig = {
    title: string;
    fetcher: () => Promise<Movie[]>;
    viewAllUrl?: string;
  };

  let sectionConfigs: SectionConfig[] = [];

  if (type === "tv" || type === "phim-bo") {
    sectionConfigs = [
      {
        title: "Top IMDb: Phim bộ đánh giá cao",
        fetcher: () => getTopImdbMovies("tv", 14, signal),
        viewAllUrl: "/?type=tv&imdb=7.0",
      },
      {
        title: "Phim bộ mới cập nhật",
        fetcher: () => getMoviesByCategory("phim-bo", 1, signal),
        viewAllUrl: "/?type=tv",
      },
      {
        title: "TV Shows nổi bật",
        fetcher: () => getMoviesByCategory("tv-shows", 1, signal),
        viewAllUrl: "/?type=tv-shows",
      },
      {
        title: "Phim bộ Trung Quốc",
        fetcher: () => getMoviesByCountry("trung-quoc", 1, signal),
        viewAllUrl: "/?type=tv&country=trung-quoc",
      },
      {
        title: "Phim bộ Hàn Quốc",
        fetcher: () => getMoviesByCountry("han-quoc", 1, signal),
        viewAllUrl: "/?type=tv&country=han-quoc",
      },
      {
        title: "Phim bộ Âu Mỹ",
        fetcher: () => getMoviesByCountry("au-my", 1, signal),
        viewAllUrl: "/?type=tv&country=au-my",
      },
    ];
  } else if (type === "movie" || type === "phim-le") {
    sectionConfigs = [
      {
        title: "Top IMDb: Phim lẻ đánh giá cao",
        fetcher: () => getTopImdbMovies("movie", 14, signal),
        viewAllUrl: "/?type=movie&imdb=7.0",
      },
      {
        title: "Phim lẻ mới nhất",
        fetcher: () => getMoviesByCategory("phim-le", 1, signal),
        viewAllUrl: "/?type=movie",
      },
      {
        title: "Phim hành động kịch tính",
        fetcher: () => getMoviesByGenre("hanh-dong", 1, signal),
        viewAllUrl: "/?type=movie&genre=hanh-dong",
      },
      {
        title: "Phim kinh dị hấp dẫn",
        fetcher: () => getMoviesByGenre("kinh-di", 1, signal),
        viewAllUrl: "/?type=movie&genre=kinh-di",
      },
      {
        title: "Khoa học viễn tưởng",
        fetcher: () => getMoviesByGenre("khoa-hoc-vien-tuong", 1, signal),
        viewAllUrl: "/?type=movie&genre=khoa-hoc-vien-tuong",
      },
      {
        title: "Phim hài hước",
        fetcher: () => getMoviesByGenre("hai-huoc", 1, signal),
        viewAllUrl: "/?type=movie&genre=hai-huoc",
      },
    ];
  } else if (type === "hoat-hinh") {
    sectionConfigs = [
      {
        title: "Hoạt hình & Anime tuyển chọn",
        fetcher: () => getMoviesByCategory("hoat-hinh", 1, signal),
        viewAllUrl: "/?type=hoat-hinh",
      },
      {
        title: "Anime Nhật Bản",
        fetcher: () => getMoviesByCountry("nhat-ban", 1, signal),
        viewAllUrl: "/?type=hoat-hinh&country=nhat-ban",
      },
      {
        title: "Hoạt hình 3D Trung Quốc",
        fetcher: () => getMoviesByCountry("trung-quoc", 1, signal),
        viewAllUrl: "/?type=hoat-hinh&country=trung-quoc",
      },
    ];
  } else {
    // Default Home Sections
    sectionConfigs = [
      {
        title: "Phim mới cập nhật",
        fetcher: () => getNewUpdatedMovies(1, signal),
      },
      {
        title: "Top IMDb: Phim lẻ đánh giá cao",
        fetcher: () => getTopImdbMovies("movie", 14, signal),
        viewAllUrl: "/?type=movie&imdb=7.0",
      },
      {
        title: "Top IMDb: Phim bộ đánh giá cao",
        fetcher: () => getTopImdbMovies("tv", 14, signal),
        viewAllUrl: "/?type=tv&imdb=7.0",
      },
      {
        title: "Phim lẻ chọn lọc",
        fetcher: () => getMoviesByCategory("phim-le", 1, signal),
        viewAllUrl: "/?type=movie",
      },
      {
        title: "Phim bộ đặc sắc",
        fetcher: () => getMoviesByCategory("phim-bo", 1, signal),
        viewAllUrl: "/?type=tv",
      },
      {
        title: "Hoạt hình & Anime",
        fetcher: () => getMoviesByCategory("hoat-hinh", 1, signal),
        viewAllUrl: "/?type=hoat-hinh",
      },
      {
        title: "Hành động kịch tính",
        fetcher: () => getMoviesByGenre("hanh-dong", 1, signal),
        viewAllUrl: "/?genre=hanh-dong",
      },
      {
        title: "Tình cảm lãng mạn",
        fetcher: () => getMoviesByGenre("tinh-cam", 1, signal),
        viewAllUrl: "/?genre=tinh-cam",
      },
    ];
  }

  const results = await Promise.allSettled(
    sectionConfigs.map(async ({ title, fetcher, viewAllUrl }): Promise<MovieSection> => {
      const movies = await fetcher();
      return { title, movies, viewAllUrl };
    }),
  );

  return results
    .filter(
      (res): res is PromiseFulfilledResult<MovieSection> =>
        res.status === "fulfilled" && res.value.movies.length > 0,
    )
    .map((res) => res.value);
}

export const FILTER_OPTIONS = {
  types: [
    { label: "Tất cả định dạng", value: "all" },
    { label: "Phim bộ", value: "tv" },
    { label: "Phim lẻ", value: "movie" },
    { label: "Hoạt hình", value: "hoat-hinh" },
    { label: "TV Shows", value: "tv-shows" },
  ],
  imdbRatings: [
    { label: "Tất cả điểm IMDb", value: "all" },
    { label: "Từ 8.5 điểm trở lên", value: "8.5" },
    { label: "Từ 8.0 điểm trở lên", value: "8.0" },
    { label: "Từ 7.5 điểm trở lên", value: "7.5" },
    { label: "Từ 7.0 điểm trở lên", value: "7.0" },
    { label: "Từ 6.0 điểm trở lên", value: "6.0" },
    { label: "Từ 5.0 điểm trở lên", value: "5.0" },
  ],
  genres: [
    { label: "Tất cả thể loại", value: "all" },
    { label: "Hành động", value: "hanh-dong" },
    { label: "Tình cảm", value: "tinh-cam" },
    { label: "Hài hước", value: "hai-huoc" },
    { label: "Cổ trang", value: "co-trang" },
    { label: "Tâm lý", value: "tam-ly" },
    { label: "Kinh dị", value: "kinh-di" },
    { label: "Khoa học viễn tưởng", value: "khoa-hoc-vien-tuong" },
    { label: "Phiêu lưu", value: "phieu-luu" },
    { label: "Hình sự", value: "hinh-su" },
    { label: "Gây cấn", value: "gay-can" },
    { label: "Chiến tranh", value: "chien-tranh" },
    { label: "Gia đình", value: "gia-dinh" },
    { label: "Hoạt hình", value: "hoat-hinh" },
    { label: "Tài liệu", value: "tai-lieu" },
    { label: "Bí ẩn", value: "bi-an" },
  ],
  countries: [
    { label: "Tất cả quốc gia", value: "all" },
    { label: "Trung Quốc", value: "trung-quoc" },
    { label: "Hàn Quốc", value: "han-quoc" },
    { label: "Âu Mỹ", value: "au-my" },
    { label: "Nhật Bản", value: "nhat-ban" },
    { label: "Thái Lan", value: "thai-lan" },
    { label: "Việt Nam", value: "viet-nam" },
    { label: "Hồng Kông", value: "hong-kong" },
    { label: "Đài Loan", value: "dai-loan" },
    { label: "Anh", value: "anh" },
    { label: "Pháp", value: "phap" },
    { label: "Ấn Độ", value: "an-do" },
  ],
  years: [
    { label: "Tất cả năm", value: "all" },
    { label: "2026", value: "2026" },
    { label: "2025", value: "2025" },
    { label: "2024", value: "2024" },
    { label: "2023", value: "2023" },
    { label: "2022", value: "2022" },
    { label: "2021", value: "2021" },
    { label: "2020", value: "2020" },
    { label: "2019", value: "2019" },
    { label: "2018", value: "2018" },
  ],
};

export async function getFilteredCatalog(
  params: FilterParams,
  signal?: AbortSignal,
): Promise<FilterResult> {
  const page = params.page || 1;

  const result = await executeWithFailover(async (provider) => {
    if (provider === "phimapi") {
      let typeSlug = "phim-moi";
      if (params.type === "tv" || params.type === "phim-bo") {
        typeSlug = "phim-bo";
      } else if (params.type === "movie" || params.type === "phim-le") {
        typeSlug = "phim-le";
      } else if (params.type === "hoat-hinh") {
        typeSlug = "hoat-hinh";
      } else if (params.type === "tv-shows") {
        typeSlug = "tv-shows";
      }

      const url = new URL(`https://phimapi.com/v1/api/danh-sach/${typeSlug}`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("sort_field", "modified.time");

      if (params.genre && params.genre !== "all") {
        url.searchParams.set("category", toPhimApiGenreSlug(params.genre));
      }
      if (params.country && params.country !== "all") {
        url.searchParams.set("country", toPhimApiCountrySlug(params.country));
      }
      if (params.year && params.year !== "all") {
        url.searchParams.set("year", String(params.year));
      }

      if (params.imdb && params.imdb !== "all") {
        const minRating = parseFloat(String(params.imdb));
        url.searchParams.set("page", String(page));
        const data1 = await fetchJson<PhimApiListResponse>(url.toString(), signal);
        const items1 = data1.data?.items || data1.items || [];

        let items2: PhimApiItem[] = [];
        try {
          const url2 = new URL(url.toString());
          url2.searchParams.set("page", String(page + 1));
          const data2 = await fetchJson<PhimApiListResponse>(url2.toString(), signal);
          items2 = data2.data?.items || data2.items || [];
        } catch {
          // Ignore secondary page failures
        }

        const allItems = [...items1, ...items2];
        const allMovies = allItems.map((m) =>
          mapPhimApiMovie(m, data1.data?.APP_DOMAIN_CDN_IMAGE),
        );

        const seen = new Set<string>();
        const filtered = allMovies.filter((m) => {
          const key = m.slug || m.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return m.imdbRating !== undefined && m.imdbRating >= minRating;
        });

        filtered.sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0));

        const pag = data1.data?.params?.pagination || data1.pagination;
        const totalEstimatedPages = Math.max(1, Math.ceil((pag?.totalPages || 1) / 2));

        return {
          movies: filtered,
          currentPage: page,
          totalPage: totalEstimatedPages,
          totalItems: pag?.totalItems ? Math.round(pag.totalItems * 0.4) : filtered.length,
          provider: "phimapi" as ApiProviderId,
        };
      }

      const data = await fetchJson<PhimApiListResponse>(url.toString(), signal);
      const items = data.data?.items || data.items || [];
      const movies = items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
      const pag = data.data?.params?.pagination || data.pagination;

      return {
        movies,
        currentPage: pag?.currentPage || page,
        totalPage: pag?.totalPages || 1,
        totalItems: pag?.totalItems ?? movies.length,
        provider: "phimapi" as ApiProviderId,
      };
    } else {
      // NguonC
      let endpoint = `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`;
      const hasGenre = Boolean(params.genre && params.genre !== "all");
      const hasCountry = Boolean(params.country && params.country !== "all");
      const hasYear = Boolean(params.year && params.year !== "all");
      const hasType = Boolean(params.type && params.type !== "all");

      if (hasCountry) {
        endpoint = `https://phim.nguonc.com/api/films/quoc-gia/${toNguonCCountrySlug(params.country!)}?page=${page}`;
      } else if (hasGenre) {
        endpoint = `https://phim.nguonc.com/api/films/the-loai/${toNguonCGenreSlug(params.genre!)}?page=${page}`;
      } else if (hasYear) {
        endpoint = `https://phim.nguonc.com/api/films/nam-phat-hanh/${params.year}?page=${page}`;
      } else if (hasType) {
        const typeSlug =
          params.type === "tv"
            ? "phim-bo"
            : params.type === "movie"
              ? "phim-le"
              : params.type;
        endpoint = `https://phim.nguonc.com/api/films/danh-sach/${typeSlug}?page=${page}`;
      }

      const data = await fetchJson<NguonCListResponse>(endpoint, signal);
      let movies = (data.items || []).map(mapNguonCMovie);

      // Client-side filtering on NguonC for unhandled dimensions
      if (hasYear) {
        const targetYear = String(params.year);
        movies = movies.filter((m) => String(m.year) === targetYear);
      }

      if (hasType) {
        if (params.type === "tv" || params.type === "phim-bo") {
          movies = movies.filter(
            (m) =>
              m.kind === "Series" ||
              (m.totalEpisodes !== undefined && m.totalEpisodes > 1) ||
              (m.currentEpisode !== undefined && !m.currentEpisode.toLowerCase().includes("full")),
          );
        } else if (params.type === "movie" || params.type === "phim-le") {
          movies = movies.filter(
            (m) =>
              m.kind === "Phim lẻ" ||
              m.totalEpisodes === 1 ||
              (m.currentEpisode !== undefined && m.currentEpisode.toLowerCase().includes("full")),
          );
        }
      }

      if (hasCountry && hasGenre) {
        const targetGenreLabel =
          FILTER_OPTIONS.genres.find((g) => g.value === params.genre)?.label.toLowerCase() ||
          params.genre!.toLowerCase();

        const enriched = await Promise.all(
          movies.map(async (m) => {
            try {
              const detail = await fetchJson<NguonCDetailResponse>(
                `https://phim.nguonc.com/api/film/${m.slug}`,
                signal,
              );
              const cats = detail.movie?.category;
              const genres: string[] = [];
              if (cats && typeof cats === "object") {
                Object.values(cats).forEach((cat) => {
                  (cat.list || []).forEach((entry) => {
                    if (entry.name) genres.push(entry.name.toLowerCase());
                  });
                });
              }
              return { movie: m, genres };
            } catch {
              return { movie: m, genres: [] };
            }
          }),
        );

        movies = enriched
          .filter(({ genres }) =>
            genres.some((g) => g.includes(targetGenreLabel) || targetGenreLabel.includes(g)),
          )
          .map(({ movie }) => movie);
      }

      const hasImdb = Boolean(params.imdb && params.imdb !== "all");
      if (hasImdb) {
        const minRating = parseFloat(String(params.imdb));
        if (!isNaN(minRating)) {
          movies = movies.filter(
            (m) => m.imdbRating !== undefined && m.imdbRating >= minRating,
          );
          movies.sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0));
        }
      }

      const isMultiFiltered = [hasGenre, hasCountry, hasYear, hasType, hasImdb].filter(Boolean).length > 1;
      const totalItems = isMultiFiltered
        ? movies.length
        : data.paginate?.total_items || movies.length;
      const totalPage = isMultiFiltered
        ? Math.max(1, Math.ceil(movies.length / 24))
        : data.paginate?.total_page || 1;

      return {
        movies,
        currentPage: data.paginate?.current_page || page,
        totalPage,
        totalItems,
        provider: "nguonc" as ApiProviderId,
      };
    }
  });

  return result.data;
}

// -------------------------------------------------------------
// Related Franchise & Seasons Discovery
// -------------------------------------------------------------
export type FranchisePart = {
  id: string;
  slug: string;
  title: string;
  partLabel: string;
  year?: number;
  quality?: string;
  posterUrl?: string;
  isCurrent: boolean;
};

function normalizeBaseTitle(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRomanNumeral(str: string): number | null {
  const romanMap: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5,
    vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
    xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15,
    xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20,
  };
  return romanMap[str.toLowerCase()] || null;
}

export function parseSeasonInfo(
  title: string,
  slug: string,
): {
  season: number | null;
  baseTitle: string;
  baseSlug: string;
  normBase: string;
} {
  let season: number | null = null;
  let baseTitle = title.trim();

  // 1. Strip release years and subtitle/audio tags from end repeatedly
  let prevTitle = "";
  while (prevTitle !== baseTitle) {
    prevTitle = baseTitle;
    baseTitle = baseTitle
      .replace(
        /(?:\s*[\(\[\{]?(?:thuyết minh|lồng tiếng|vietsub|raw|full|hd|cam|bản đẹp|trọn bộ|tập cuối)[\)\]\}]?\s*)+$/i,
        "",
      )
      .replace(/(?:\s*[\(\[\{]?(?:19\d{2}|20\d{2})[\)\]\}]?\s*)+$/, "")
      .trim()
      .replace(/[-–:\s]+$/, "");
  }

  // 2. Match explicit season tag in title: (Phần X), Phần X, Season X, Mùa X, Part X, SS X, Phần II
  const seasonRegex = /[\(\[\{]?(?:phần|season|mùa|part|ss)\s*(\d{1,2}|[ivx]+)[\)\]\}]?\s*$/i;
  const tm = baseTitle.match(seasonRegex);
  if (tm) {
    const rawVal = tm[1];
    const parsedNum = /^\d+$/.test(rawVal) ? parseInt(rawVal, 10) : parseRomanNumeral(rawVal);
    if (parsedNum && parsedNum >= 1 && parsedNum <= 30) {
      season = parsedNum;
      baseTitle = baseTitle.replace(seasonRegex, "").trim().replace(/[-–:\s]+$/, "");
    }
  } else {
    // Check trailing number or roman numeral: e.g. 'Âm Thanh Tội Phạm 2', 'Iron Man 3'
    const trailingNumRegex = /\s+(\d{1,2}|[ivx]+)\s*$/i;
    const tnm = baseTitle.match(trailingNumRegex);
    if (tnm) {
      const rawVal = tnm[1];
      const parsedNum = /^\d+$/.test(rawVal) ? parseInt(rawVal, 10) : parseRomanNumeral(rawVal);
      if (parsedNum && parsedNum >= 1 && parsedNum <= 30) {
        season = parsedNum;
        baseTitle = baseTitle.replace(trailingNumRegex, "").trim().replace(/[-–:\s]+$/, "");
      }
    }
  }

  // 3. Clean slug and check for season tag
  let cleanSlug = slug;
  let prevSlug = "";
  while (prevSlug !== cleanSlug) {
    prevSlug = cleanSlug;
    cleanSlug = cleanSlug
      .replace(/-(?:19\d{2}|20\d{2})$/, "")
      .replace(/-(?:vietsub|thuyet-minh|long-tieng|raw|full|hd|cam)$/i, "");
  }

  const slugSeasonRegex = /-(?:phan|season|part|ss|mua)?-?(\d{1,2}|[ivx]+)$/i;
  const sm = cleanSlug.match(slugSeasonRegex);
  let baseSlug = cleanSlug;
  if (sm) {
    const rawVal = sm[1];
    const sNum = /^\d+$/.test(rawVal) ? parseInt(rawVal, 10) : parseRomanNumeral(rawVal);
    if (sNum && sNum >= 1 && sNum <= 30) {
      if (season === null) season = sNum;
      baseSlug = cleanSlug.replace(slugSeasonRegex, "");
    }
  }

  return { season, baseTitle, baseSlug, normBase: normalizeBaseTitle(baseTitle) };
}

export async function getFranchiseParts(
  movie: { title: string; slug: string; kind?: string },
  signal?: AbortSignal,
): Promise<FranchisePart[]> {
  try {
    const current = parseSeasonInfo(movie.title, movie.slug);
    if (!current.baseTitle || current.baseTitle.length < 2) return [];

    const results = await searchMovies(current.baseTitle, 1, signal);
    if (!results || results.length < 2) return [];

    const matched: (FranchisePart & { season: number })[] = [];

    for (const item of results) {
      const cInfo = parseSeasonInfo(item.title, item.slug);
      const slugMatch = item.slug === current.baseSlug || cInfo.baseSlug === current.baseSlug;
      const titleMatch = cInfo.normBase === current.normBase;

      // Strict franchise boundary check: Reject any movie whose base title or base slug doesn't match the franchise!
      if (!slugMatch && !titleMatch) continue;

      // Reject candidates that have extra subtitles or different names
      if (
        cInfo.season === null &&
        item.slug !== current.baseSlug &&
        cInfo.normBase !== current.normBase
      ) {
        continue;
      }

      const seasonNum = cInfo.season || 1;
      matched.push({
        id: item.id || item.slug,
        slug: item.slug,
        title: item.title,
        partLabel: `Phần ${seasonNum}`,
        season: seasonNum,
        year: item.year,
        quality: item.quality,
        posterUrl: item.posterUrl,
        isCurrent: item.slug === movie.slug,
      });
    }

    // Ensure current movie itself is included in matched
    if (!matched.some((m) => m.isCurrent)) {
      const currentSeasonNum = current.season || 1;
      matched.push({
        id: movie.slug,
        slug: movie.slug,
        title: movie.title,
        partLabel: `Phần ${currentSeasonNum}`,
        season: currentSeasonNum,
        year: undefined,
        isCurrent: true,
      });
    }

    // Deduplicate: exactly ONE button per season number!
    const bySeason = new Map<number, FranchisePart & { season: number }>();
    for (const item of matched) {
      if (!bySeason.has(item.season)) {
        bySeason.set(item.season, item);
      } else {
        const existing = bySeason.get(item.season)!;
        if (item.isCurrent) {
          bySeason.set(item.season, item);
        } else if (
          !existing.isCurrent &&
          (item.slug === `${current.baseSlug}-phan-${item.season}` ||
            item.slug === current.baseSlug)
        ) {
          bySeason.set(item.season, item);
        }
      }
    }

    const list = Array.from(bySeason.values()).sort((a, b) => a.season - b.season);

    // ONLY show franchise selector if there are at least 2 distinct seasons, AND at least one season > 1
    if (list.length <= 1 || !list.some((x) => x.season > 1)) {
      return [];
    }

    return list.map(({ season, ...rest }) => rest);
  } catch {
    return [];
  }
}

