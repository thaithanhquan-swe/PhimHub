import type { EpisodeServer, Movie, MovieDetails } from "@/data/movies";

export type { EpisodeItem, EpisodeServer, Movie, MovieDetails } from "@/data/movies";

const API_BASE = "https://phim.nguonc.com/api";

export type MovieSection = {
  title: string;
  movies: Movie[];
  slug?: string;
};

type NguonCPaginate = {
  current_page: number;
  total_page: number;
  total_items: number;
  items_per_page: number;
};

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
  paginate?: NguonCPaginate;
  items: NguonCMovieItem[];
  cat?: { name: string; title: string; slug: string };
  message?: string;
};

type NguonCDetailResponse = {
  status: string;
  movie: NguonCMovieItem & {
    episodes?: EpisodeServer[];
  };
  message?: string;
};

// Memory cache for fast browsing and preventing repeated calls
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}${path}`;
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối máy chủ phim (${response.status}). Vui lòng thử lại.`);
  }

  const data = (await response.json()) as T;
  cache.set(url, { data, expiresAt: now + CACHE_TTL_MS });
  return data;
}

const GENRE_NAME_TO_SLUG: Record<string, string> = {
  "hành động": "hanh-dong",
  "phiêu lưu": "phieu-luu",
  "hoạt hình": "hoat-hinh",
  "hài": "hai",
  "hình sự": "hinh-su",
  "tài liệu": "tai-lieu",
  "chính kịch": "chinh-kich",
  "gia đình": "gia-dinh",
  "giả tưởng": "gia-tuong",
  "lịch sử": "lich-su",
  "kinh dị": "kinh-di",
  "nhạc": "nhac",
  "bí ẩn": "bi-an",
  "lãng mạn": "lang-man",
  "tình cảm": "tinh-cam",
  "khoa học viễn tưởng": "khoa-hoc-vien-tuong",
  "gây cấn": "gay-can",
  "chiến tranh": "chien-tranh",
  "tâm lý": "tam-ly",
  "cổ trang": "co-trang",
  "miền tây": "mien-tay",
  "phim 18+": "phim-18",
};

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

  // In Nguonc API:
  // thumb_url is vertical 2:3 portrait (ideal for MovieCard poster)
  // poster_url is horizontal 16:9 landscape (ideal for Hero / MovieDetail backdrop banner)
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

export async function getNewUpdatedMovies(page = 1, signal?: AbortSignal): Promise<Movie[]> {
  const data = await request<NguonCListResponse>(`/films/phim-moi-cap-nhat?page=${page}`, signal);
  return (data.items || []).map(mapNguonCMovie);
}

export async function getMoviesByCategory(
  slug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await request<NguonCListResponse>(`/films/danh-sach/${slug}?page=${page}`, signal);
  return (data.items || []).map(mapNguonCMovie);
}

export async function getMoviesByGenre(
  slug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await request<NguonCListResponse>(`/films/the-loai/${slug}?page=${page}`, signal);
  return (data.items || []).map(mapNguonCMovie);
}

export async function getMoviesByCountry(
  slug: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await request<NguonCListResponse>(`/films/quoc-gia/${slug}?page=${page}`, signal);
  return (data.items || []).map(mapNguonCMovie);
}

export async function getMoviesByYear(
  year: number,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await request<NguonCListResponse>(`/films/nam-phat-hanh/${year}?page=${page}`, signal);
  return (data.items || []).map(mapNguonCMovie);
}

export async function searchMovies(
  keyword: string,
  page = 1,
  signal?: AbortSignal,
): Promise<Movie[]> {
  if (!keyword.trim()) return [];
  const data = await request<NguonCListResponse>(
    `/films/search?keyword=${encodeURIComponent(keyword.trim())}&page=${page}`,
    signal,
  );
  return (data.items || []).map(mapNguonCMovie);
}

export async function getMovieDetails(slug: string, signal?: AbortSignal): Promise<MovieDetails> {
  const data = await request<NguonCDetailResponse>(`/film/${slug}`, signal);
  if (!data.movie || data.status !== "success") {
    throw new Error("Không tìm thấy thông tin phim.");
  }

  const raw = data.movie;
  const baseMovie = mapNguonCMovie(raw);

  const genres: string[] = [];
  const countries: string[] = [];
  let detectedKind: Movie["kind"] = baseMovie.kind;
  let primaryGenreSlug = "";

  if (raw.category && typeof raw.category === "object") {
    Object.values(raw.category).forEach((cat) => {
      const groupName = (cat.group?.name || "").toLowerCase();
      const list = cat.list || [];
      list.forEach((entry) => {
        const name = entry.name?.trim();
        if (!name) return;

        if (groupName.includes("định dạng")) {
          if (name.toLowerCase().includes("bộ") || name.toLowerCase().includes("series")) {
            detectedKind = "Series";
          }
        } else if (groupName.includes("thể loại")) {
          genres.push(name);
          if (!primaryGenreSlug) {
            primaryGenreSlug = GENRE_NAME_TO_SLUG[name.toLowerCase()] || "";
          }
        } else if (groupName.includes("quốc gia")) {
          countries.push(name);
        } else {
          genres.push(name);
        }
      });
    });
  }

  // Fetch recommendations based on primary genre or latest movies
  let recommendations: Movie[] = [];
  try {
    const recs = primaryGenreSlug
      ? await getMoviesByGenre(primaryGenreSlug, 1, signal)
      : await getNewUpdatedMovies(1, signal);
    recommendations = recs.filter((m) => m.slug !== slug).slice(0, 10);
  } catch {
    // Non-critical, ignore recommendation fetch failure
    recommendations = [];
  }

  return {
    ...baseMovie,
    kind: detectedKind,
    overview: baseMovie.description,
    genres: genres.length > 0 ? genres : [baseMovie.genre],
    countries,
    episodes: raw.episodes || [],
    recommendations,
    tmdbUrl: raw.tmdb?.url || null,
    imdbUrl: raw.imdb?.url || null,
  };
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
        fetcher: () => getMoviesByCountry("my", 1, signal),
      },
    ];
  } else if (type === "movie" || type === "phim-le") {
    sectionConfigs = [
      {
        title: "Phim lẻ mới nhất",
        fetcher: () => getMoviesByCategory("phim-le", 1, signal),
      },
      {
        title: "Phim hành động gay cấn",
        fetcher: () => getMoviesByGenre("hanh-dong", 1, signal),
      },
      {
        title: "Phim kinh dị kịch tính",
        fetcher: () => getMoviesByGenre("kinh-di", 1, signal),
      },
      {
        title: "Khoa học viễn tưởng",
        fetcher: () => getMoviesByGenre("khoa-hoc-vien-tuong", 1, signal),
      },
      {
        title: "Phim hài hước",
        fetcher: () => getMoviesByGenre("hai", 1, signal),
      },
    ];
  } else if (type === "hoat-hinh") {
    sectionConfigs = [
      {
        title: "Hoạt hình & Anime tuyển chọn",
        fetcher: () => getMoviesByGenre("hoat-hinh", 1, signal),
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
    // Default home
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
        fetcher: () => getMoviesByGenre("hoat-hinh", 1, signal),
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
};

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
    { label: "Hài hước", value: "hai" },
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
    { label: "Âu Mỹ", value: "my" },
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
  let endpoint = `/films/phim-moi-cap-nhat?page=${page}`;

  // Priority mapping based on specific filters
  if (params.genre && params.genre !== "all") {
    endpoint = `/films/the-loai/${params.genre}?page=${page}`;
  } else if (params.country && params.country !== "all") {
    endpoint = `/films/quoc-gia/${params.country}?page=${page}`;
  } else if (params.year && params.year !== "all") {
    endpoint = `/films/nam-phat-hanh/${params.year}?page=${page}`;
  } else if (params.type && params.type !== "all") {
    const typeSlug =
      params.type === "tv"
        ? "phim-bo"
        : params.type === "movie"
          ? "phim-le"
          : params.type;
    endpoint = `/films/danh-sach/${typeSlug}?page=${page}`;
  }

  const data = await request<NguonCListResponse>(endpoint, signal);
  let movies = (data.items || []).map(mapNguonCMovie);

  // Client-side refinements
  if (params.type && params.type !== "all") {
    if (params.type === "tv") {
      movies = movies.filter((m) => m.kind === "Series");
    } else if (params.type === "movie") {
      movies = movies.filter((m) => m.kind === "Phim lẻ");
    }
  }

  if (params.year && params.year !== "all") {
    const yNum = Number(params.year);
    if (!isNaN(yNum)) {
      movies = movies.filter((m) => m.year === yNum);
    }
  }

  return {
    movies,
    currentPage: data.paginate?.current_page || page,
    totalPage: data.paginate?.total_page || 1,
    totalItems: data.paginate?.total_items || movies.length,
  };
}
