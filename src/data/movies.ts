export type Movie = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  year: number;
  rating?: string;
  imdbId?: string;
  imdbUrl?: string;
  imdbRating?: number;
  genre: string;
  kind: "Phim lẻ" | "Series" | "Tài liệu";
  badge?: string;
  image?: string;
  posterUrl?: string;
  backdropUrl?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  description: string;
  runtime: string;
  quality?: string;
  language?: string;
  currentEpisode?: string;
  totalEpisodes?: number;
  director?: string;
  casts?: string;
  trailerUrl?: string;
  trailerId?: string;
};

export type EpisodeItem = {
  name: string;
  slug: string;
  embed: string;
  m3u8?: string;
};

export type EpisodeServer = {
  server_name: string;
  items: EpisodeItem[];
};

export type MovieDetails = Movie & {
  overview: string;
  genres: string[];
  countries: string[];
  episodes: EpisodeServer[];
  recommendations: Movie[];
  tmdbUrl?: string | null;
};

export const genres = [
  "Tất cả",
  "Hành động",
  "Phiêu lưu",
  "Hoạt hình",
  "Hài",
  "Kinh dị",
  "Tâm lý",
  "Tình cảm",
  "Khoa học viễn tưởng",
  "Hình sự",
  "Cổ trang",
  "Tài liệu",
];

export const movies: Movie[] = [];

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80";
const FALLBACK_BACKDROP =
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80";

export function getPosterUrl(movie?: Partial<Movie> | null, _size?: string): string {
  if (!movie) return FALLBACK_POSTER;
  if (movie.posterUrl && movie.posterUrl.trim()) return movie.posterUrl;
  if (movie.posterPath && movie.posterPath.trim()) {
    return movie.posterPath.startsWith("http")
      ? movie.posterPath
      : `https://image.tmdb.org/t/p/${_size || "w342"}${movie.posterPath}`;
  }
  if (movie.backdropUrl && movie.backdropUrl.trim()) return movie.backdropUrl;
  if (movie.image && movie.image.trim()) {
    return movie.image.startsWith("http")
      ? movie.image
      : `https://images.unsplash.com/${movie.image}?auto=format&fit=crop&w=360&q=70`;
  }
  return FALLBACK_POSTER;
}

export function getBackdropUrl(movie?: Partial<Movie> | null, _size?: string): string {
  if (!movie) return FALLBACK_BACKDROP;
  if (movie.backdropUrl && movie.backdropUrl.trim()) return movie.backdropUrl;
  if (movie.backdropPath && movie.backdropPath.trim()) {
    return movie.backdropPath.startsWith("http")
      ? movie.backdropPath
      : `https://image.tmdb.org/t/p/${_size || "w1280"}${movie.backdropPath}`;
  }
  if (movie.posterUrl && movie.posterUrl.trim()) return movie.posterUrl;
  if (movie.image && movie.image.trim()) {
    return movie.image.startsWith("http")
      ? movie.image
      : `https://images.unsplash.com/${movie.image}?auto=format&fit=crop&w=1280&q=75`;
  }
  return FALLBACK_BACKDROP;
}
