import type { EpisodeServer, Movie, MovieDetails } from "@/data/movies";

export type { EpisodeItem, EpisodeServer, Movie, MovieDetails } from "@/data/movies";

export type ApiProviderId = "phimapi" | "nguonc";

export type ProviderStatus = {
  id: ApiProviderId;
  name: string;
  baseUrl: string;
  description: string;
  isActive: boolean;
  status: "online" | "degraded" | "offline";
  lastError?: string;
  lastChecked?: number;
};

export type MovieSection = {
  title: string;
  movies: Movie[];
  slug?: string;
};

export type FilterParams = {
  type?: string; // "tv" | "movie" | "hoat-hinh" | "tv-shows" | "all"
  genre?: string;
  country?: string;
  year?: string | number;
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

// Current active provider with localStorage persistence
const STORAGE_KEY = "phimhub_active_provider";
let activeProvider: ApiProviderId = (() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY) as ApiProviderId;
    if (saved === "phimapi" || saved === "nguonc") return saved;
  }
  return "phimapi"; // PhimAPI is the primary stable provider
})();

const providerHealth: Record<ApiProviderId, { status: "online" | "degraded" | "offline"; lastError?: string; lastChecked: number }> = {
  phimapi: { status: "online", lastChecked: Date.now() },
  nguonc: { status: "degraded", lastError: "Máy chủ phát streamc.xyz trả về HTTP 403", lastChecked: Date.now() },
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
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newProvider);
    }
    notifyListeners();
  }
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

// Generic failover executor: Tries primary, on error automatically falls back to secondary
async function executeWithFailover<T>(
  operation: (provider: ApiProviderId) => Promise<T>,
): Promise<{ data: T; provider: ApiProviderId }> {
  const primary = activeProvider;
  const fallback: ApiProviderId = primary === "phimapi" ? "nguonc" : "phimapi";

  try {
    const data = await operation(primary);
    providerHealth[primary] = { status: "online", lastChecked: Date.now() };
    return { data, provider: primary };
  } catch (primaryErr) {
    const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[Failover] Nguồn ${PROVIDER_CONFIGS[primary].name} gặp sự cố (${errMsg}). Tự động luân phiên sang ${PROVIDER_CONFIGS[fallback].name}...`);

    providerHealth[primary] = {
      status: "degraded",
      lastError: errMsg,
      lastChecked: Date.now(),
    };

    try {
      const data = await operation(fallback);
      providerHealth[fallback] = { status: "online", lastChecked: Date.now() };
      
      // Auto-switch active provider to healthy fallback
      setActiveProvider(fallback);
      return { data, provider: fallback };
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      providerHealth[fallback] = {
        status: "offline",
        lastError: fallbackMsg,
        lastChecked: Date.now(),
      };
      throw new Error(
        `Cả hai nguồn phim (${PROVIDER_CONFIGS[primary].name} & ${PROVIDER_CONFIGS[fallback].name}) đều không phản hồi: ${errMsg}`,
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
  imdb?: { id: string | null; url: string | null };
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
    description: cleanDesc || "Chưa có mô tả cho bộ phim này.",
    runtime: item.time || (isSeries ? "Đang chiếu" : "Bản đẹp"),
    quality,
    language,
    currentEpisode: item.episode_current || "FULL",
    totalEpisodes: isSeries ? 0 : 1,
    director: director || undefined,
    casts: casts || undefined,
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
    description: cleanDesc || "Chưa có mô tả cho bộ phim này.",
    runtime: item.time || (isSeries ? `${totalEp} tập` : "Bản đẹp"),
    quality,
    language,
    currentEpisode: item.current_episode || "FULL",
    totalEpisodes: totalEp,
    director: item.director || undefined,
    casts: item.casts || undefined,
  };
}

// -------------------------------------------------------------
// Slug compatibility helpers between PhimAPI & NguonC
// -------------------------------------------------------------
function toPhimApiGenreSlug(slug: string): string {
  if (slug === "hai") return "hai-huoc";
  return slug;
}

function toNguonCGenreSlug(slug: string): string {
  if (slug === "hai-huoc") return "hai";
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

export async function getHomeSections(
  signal?: AbortSignal,
  type?: string | null,
): Promise<MovieSection[]> {
  type SectionConfig = {
    title: string;
    fetcher: () => Promise<Movie[]>;
  };

  let sectionConfigs: SectionConfig[] = [];

  if (type === "tv" || type === "phim-bo") {
    sectionConfigs = [
      {
        title: "Phim bộ mới cập nhật",
        fetcher: () => getMoviesByCategory("phim-bo", 1, signal),
      },
      {
        title: "TV Shows nổi bật",
        fetcher: () => getMoviesByCategory("tv-shows", 1, signal),
      },
      {
        title: "Phim bộ Trung Quốc",
        fetcher: () => getMoviesByCountry("trung-quoc", 1, signal),
      },
      {
        title: "Phim bộ Hàn Quốc",
        fetcher: () => getMoviesByCountry("han-quoc", 1, signal),
      },
      {
        title: "Phim bộ Âu Mỹ",
        fetcher: () => getMoviesByCountry("au-my", 1, signal),
      },
    ];
  } else if (type === "movie" || type === "phim-le") {
    sectionConfigs = [
      {
        title: "Phim lẻ mới nhất",
        fetcher: () => getMoviesByCategory("phim-le", 1, signal),
      },
      {
        title: "Phim hành động kịch tính",
        fetcher: () => getMoviesByGenre("hanh-dong", 1, signal),
      },
      {
        title: "Phim kinh dị hấp dẫn",
        fetcher: () => getMoviesByGenre("kinh-di", 1, signal),
      },
      {
        title: "Khoa học viễn tưởng",
        fetcher: () => getMoviesByGenre("khoa-hoc-vien-tuong", 1, signal),
      },
      {
        title: "Phim hài hước",
        fetcher: () => getMoviesByGenre("hai-huoc", 1, signal),
      },
    ];
  } else if (type === "hoat-hinh") {
    sectionConfigs = [
      {
        title: "Hoạt hình & Anime tuyển chọn",
        fetcher: () => getMoviesByCategory("hoat-hinh", 1, signal),
      },
      {
        title: "Anime Nhật Bản",
        fetcher: () => getMoviesByCountry("nhat-ban", 1, signal),
      },
      {
        title: "Hoạt hình 3D Trung Quốc",
        fetcher: () => getMoviesByCountry("trung-quoc", 1, signal),
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
        title: "Phim lẻ chọn lọc",
        fetcher: () => getMoviesByCategory("phim-le", 1, signal),
      },
      {
        title: "Phim bộ đặc sắc",
        fetcher: () => getMoviesByCategory("phim-bo", 1, signal),
      },
      {
        title: "Hoạt hình & Anime",
        fetcher: () => getMoviesByCategory("hoat-hinh", 1, signal),
      },
      {
        title: "Hành động kịch tính",
        fetcher: () => getMoviesByGenre("hanh-dong", 1, signal),
      },
      {
        title: "Tình cảm lãng mạn",
        fetcher: () => getMoviesByGenre("tinh-cam", 1, signal),
      },
    ];
  }

  const results = await Promise.allSettled(
    sectionConfigs.map(async ({ title, fetcher }) => {
      const movies = await fetcher();
      return { title, movies };
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
      let endpoint = `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`;

      if (params.genre && params.genre !== "all") {
        endpoint = `https://phimapi.com/v1/api/the-loai/${toPhimApiGenreSlug(params.genre)}?page=${page}`;
      } else if (params.country && params.country !== "all") {
        endpoint = `https://phimapi.com/v1/api/quoc-gia/${toPhimApiCountrySlug(params.country)}?page=${page}`;
      } else if (params.year && params.year !== "all") {
        endpoint = `https://phimapi.com/v1/api/nam-phat-hanh/${params.year}?page=${page}`;
      } else if (params.type && params.type !== "all") {
        const typeSlug =
          params.type === "tv"
            ? "phim-bo"
            : params.type === "movie"
              ? "phim-le"
              : params.type;
        endpoint = `https://phimapi.com/v1/api/danh-sach/${typeSlug}?page=${page}`;
      }

      const data = await fetchJson<PhimApiListResponse>(endpoint, signal);
      const items = data.data?.items || data.items || [];
      const movies = items.map((m) => mapPhimApiMovie(m, data.data?.APP_DOMAIN_CDN_IMAGE));
      const pag = data.data?.params?.pagination || data.pagination;

      return {
        movies,
        currentPage: pag?.currentPage || page,
        totalPage: pag?.totalPages || 1,
        totalItems: pag?.totalItems || movies.length,
        provider: "phimapi" as ApiProviderId,
      };
    } else {
      let endpoint = `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`;

      if (params.genre && params.genre !== "all") {
        endpoint = `https://phim.nguonc.com/api/films/the-loai/${toNguonCGenreSlug(params.genre)}?page=${page}`;
      } else if (params.country && params.country !== "all") {
        endpoint = `https://phim.nguonc.com/api/films/quoc-gia/${toNguonCCountrySlug(params.country)}?page=${page}`;
      } else if (params.year && params.year !== "all") {
        endpoint = `https://phim.nguonc.com/api/films/nam-phat-hanh/${params.year}?page=${page}`;
      } else if (params.type && params.type !== "all") {
        const typeSlug =
          params.type === "tv"
            ? "phim-bo"
            : params.type === "movie"
              ? "phim-le"
              : params.type;
        endpoint = `https://phim.nguonc.com/api/films/danh-sach/${typeSlug}?page=${page}`;
      }

      const data = await fetchJson<NguonCListResponse>(endpoint, signal);
      const movies = (data.items || []).map(mapNguonCMovie);

      return {
        movies,
        currentPage: data.paginate?.current_page || page,
        totalPage: data.paginate?.total_page || 1,
        totalItems: data.paginate?.total_items || movies.length,
        provider: "nguonc" as ApiProviderId,
      };
    }
  });

  return result.data;
}
