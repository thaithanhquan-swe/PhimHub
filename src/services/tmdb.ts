import { genres, movies, type Movie } from "@/data/movies";

const API_BASE = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim();

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
};

export type Trailer = {
  key: string;
  name: string;
};

export type MovieDetails = Movie & {
  overview: string;
  genres: string[];
  cast: CastMember[];
  trailer: Trailer | null;
  recommendations: Movie[];
};

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  runtime?: number | null;
};

type TmdbList = { results: TmdbMovie[] };
type TmdbDetails = TmdbMovie & {
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
};
type TmdbCredits = {
  cast?: {
    id: number;
    name: string;
    character?: string;
    roles?: { character: string }[];
    profile_path: string | null;
  }[];
};
type TmdbVideos = {
  results?: { key: string; name: string; site: string; type: string }[];
};
type TmdbRecommendations = { results?: TmdbMovie[] };

const genreNames: Record<number, string> = {
  28: "Hành động",
  10759: "Hành động & phiêu lưu",
  10765: "Khoa học viễn tưởng & giả tưởng",
  12: "Phiêu lưu",
  16: "Hoạt hình",
  18: "Chính kịch",
  27: "Kinh dị",
  35: "Hài",
  36: "Lịch sử",
  37: "Viễn Tây",
  53: "Giật gân",
  80: "Hình sự",
  99: "Tài liệu",
  878: "Khoa học viễn tưởng",
  9648: "Bí ẩn",
  10402: "Âm nhạc",
  10749: "Tình cảm",
  10751: "Gia đình",
  10752: "Chiến tranh",
  14: "Giả tưởng",
  10770: "Phim truyền hình",
};

export const isTmdbConfigured = Boolean(API_KEY);

function mapMovie(item: TmdbMovie, kind: Movie["kind"] = "Phim lẻ"): Movie {
  const date = item.release_date || item.first_air_date || "";
  const names = (item.genre_ids ?? [])
    .map((id) => genreNames[id])
    .filter((name): name is string => Boolean(name));
  return {
    id: String(item.id),
    title: item.title || item.name || "Chưa có tên",
    year: Number(date.slice(0, 4)) || new Date().getFullYear(),
    rating: (item.vote_average ?? 0).toFixed(1),
    genre: names[0] || "Khác",
    kind,
    image: "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    description: item.overview || "Chưa có mô tả cho bộ phim này.",
    runtime: item.runtime ? `${item.runtime} phút` : "—",
  };
}

async function request<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!API_KEY) throw new Error("TMDB API chưa được cấu hình.");
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "vi-VN");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`TMDB trả về lỗi ${response.status}. Vui lòng thử lại.`);
  }
  return (await response.json()) as T;
}

function fallbackSections(mediaType: "movie" | "tv") {
  if (mediaType === "tv") {
    const series = movies.filter((movie) => movie.kind === "Series");
    return [
      { title: "Series thịnh hành", movies: series },
      { title: "Series được yêu thích", movies: [...series].reverse() },
    ];
  }
  return [
    { title: "Thịnh hành", movies: movies.slice(0, 8) },
    { title: "Được đánh giá cao", movies: [...movies].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 8) },
    { title: "Hành động & phiêu lưu", movies: movies.filter((movie) => ["Hành động", "Phiêu lưu"].includes(movie.genre)) },
    { title: "Phim hài", movies: movies.filter((movie) => movie.genre === "Hài") },
  ];
}

export type MovieSection = { title: string; movies: Movie[] };

export async function getHomeSections(
  signal?: AbortSignal,
  mediaType: "movie" | "tv" = "movie",
): Promise<MovieSection[]> {
  const isTv = mediaType === "tv";
  const endpoints = isTv
    ? [
        { title: "Series thịnh hành", path: "/trending/tv/week" },
        { title: "Series được đánh giá cao", path: "/tv/top_rated" },
        { title: "Series hành động", path: "/discover/tv", params: { with_genres: "10759" } },
        { title: "Series hài", path: "/discover/tv", params: { with_genres: "35" } },
      ]
    : [
        { title: "Thịnh hành", path: "/trending/movie/week" },
        { title: "Được đánh giá cao", path: "/movie/top_rated" },
        { title: "Phim hành động", path: "/discover/movie", params: { with_genres: "28" } },
        { title: "Phim hài", path: "/discover/movie", params: { with_genres: "35" } },
      ];

  if (!API_KEY) return fallbackSections(mediaType);

  const results = await Promise.all(
    endpoints.map(async ({ title, path, params }) => {
      const data = await request<TmdbList>(path, params ?? {}, signal);
      return {
        title,
        movies: data.results.map((item) => mapMovie(item, isTv ? "Series" : "Phim lẻ")),
      };
    }),
  );
  return results;
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<Movie[]> {
  if (!API_KEY) {
    const term = query.toLocaleLowerCase("vi");
    return movies.filter((movie) =>
      `${movie.title} ${movie.genre} ${movie.description}`
        .toLocaleLowerCase("vi")
        .includes(term),
    );
  }
  const [movieResults, tvResults] = await Promise.all([
    request<TmdbList>("/search/movie", { query, include_adult: "false", page: "1" }, signal),
    request<TmdbList>("/search/tv", { query, include_adult: "false", page: "1" }, signal),
  ]);
  return [
    ...movieResults.results.map((item) => mapMovie(item, "Phim lẻ")),
    ...tvResults.results.map((item) => mapMovie(item, "Series")),
  ];
}

export async function getMovieDetails(
  id: string,
  signal?: AbortSignal,
  mediaType: "movie" | "tv" = "movie",
): Promise<MovieDetails> {
  if (!API_KEY) {
    const movie = movies.find((item) => item.id === id);
    if (!movie) throw new Error("Không tìm thấy phim trong dữ liệu demo.");
    return {
      ...movie,
      overview: movie.description,
      genres: [movie.genre],
      cast: [],
      trailer: null,
      recommendations: movies.filter((item) => item.id !== movie.id).slice(0, 6),
    };
  }

  const resource = mediaType === "tv" ? "tv" : "movie";
  const [detail, credits, videos, recommendations] = await Promise.all([
    request<TmdbDetails>(`/${resource}/${id}`, {}, signal),
    request<TmdbCredits>(`/${resource}/${id}/${mediaType === "tv" ? "aggregate_credits" : "credits"}`, {}, signal),
    request<TmdbVideos>(`/${resource}/${id}/videos`, {}, signal),
    request<TmdbRecommendations>(`/${resource}/${id}/recommendations`, {}, signal),
  ]);
  const movie = mapMovie(detail, mediaType === "tv" ? "Series" : "Phim lẻ");
  const trailer =
    videos.results?.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    ) ?? null;
  return {
    ...movie,
    runtime: detail.runtime
      ? `${detail.runtime} phút`
      : detail.episode_run_time?.[0]
        ? `${detail.episode_run_time[0]} phút/tập`
        : movie.runtime,
    overview: detail.overview || movie.description,
    genres: detail.genres?.map((genre) => genre.name) ?? [],
    cast:
      credits.cast?.slice(0, 10).map((person) => ({
        id: person.id,
        name: person.name,
        character:
          person.character ??
          person.roles?.map((role) => role.character).join(", ") ??
          "",
        profilePath: person.profile_path,
      })) ?? [],
    trailer: trailer ? { key: trailer.key, name: trailer.name } : null,
    recommendations:
      recommendations.results?.map((item) =>
        mapMovie(item, mediaType === "tv" ? "Series" : "Phim lẻ"),
      ) ?? [],
  };
}

export function getKnownGenres() {
  return genres;
}
