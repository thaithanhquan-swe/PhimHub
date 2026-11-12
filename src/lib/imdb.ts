type ImdbMovie = {
  title?: string;
  originalTitle?: string;
  year?: number;
  imdbId?: string;
  imdbUrl?: string;
};

const IMDB_TITLE_ID = /^tt\d{5,12}$/;

export function getImdbUrl(movie: ImdbMovie): string {
  const url = movie.imdbUrl?.trim();
  if (url) {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/title\/(tt\d{5,12})(?:\/|$)/);
      if (
        (parsed.hostname === "imdb.com" || parsed.hostname.endsWith(".imdb.com")) &&
        parsed.protocol === "https:" &&
        match
      ) {
        return `https://www.imdb.com/title/${match[1]}/`;
      }
    } catch {
      // Ignore invalid provider URLs and fall back to IMDb search.
    }
  }

  const imdbId = movie.imdbId?.trim();
  if (imdbId && IMDB_TITLE_ID.test(imdbId)) {
    return `https://www.imdb.com/title/${imdbId}/`;
  }

  const query = [movie.originalTitle || movie.title, movie.year]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ");
  return `https://www.imdb.com/find/?q=${encodeURIComponent(query)}`;
}

export function parseImdbRating(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const rating = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : undefined;
}
