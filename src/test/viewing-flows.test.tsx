import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MovieCard } from "@/components/MovieCard";
import { MovieRow } from "@/components/MovieRow";
import { VideoPlayer } from "@/components/VideoPlayer";
import { WatchHistoryProvider, useWatchHistory } from "@/context/WatchHistoryContext";
import { WatchlistProvider, useWatchlist } from "@/context/WatchlistContext";
import type { Movie } from "@/data/movies";
import { getImdbUrl, parseImdbRating } from "@/lib/imdb";
import { getImdbMetadata } from "@/lib/imdbRating";
import { queryClient } from "@/lib/queryClient";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { mapNguonCMovie, mapPhimApiMovie } from "@/services/movieApi";

const movie: Movie = {
  id: "movie-1",
  slug: "movie-1",
  title: "Test Movie",
  year: 2025,
  genre: "Drama",
  kind: "Phim lẻ",
  description: "Test",
  runtime: "90 phút",
};

function renderWithMovieProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WatchlistProvider>{ui}</WatchlistProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function WatchlistHarness() {
  const { movies, toggle, clear } = useWatchlist();
  return (
    <>
      <output>{movies.length}</output>
      <button onClick={() => toggle(movie)}>toggle</button>
      <button onClick={clear}>clear</button>
    </>
  );
}

function WatchHistoryHarness() {
  const { history, saveProgress, clearHistory } = useWatchHistory();
  return (
    <>
      <output>{history.length}</output>
      <button
        onClick={() =>
          saveProgress({
            movieId: movie.id,
            slug: movie.slug,
            title: movie.title,
            serverName: "Server 1",
            serverIndex: 0,
            episodeName: "Full",
            episodeSlug: "full",
            episodeIndex: 0,
            currentTime: 321,
            duration: 5400,
          })
        }
      >
        save progress
      </button>
      <button onClick={clearHistory}>clear history</button>
    </>
  );
}

describe("watchlist", () => {
  it("persists saved movies and can clear them", () => {
    render(
      <WatchlistProvider>
        <WatchlistHarness />
      </WatchlistProvider>,
    );

    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByText("1").textContent).toBe("1");
    expect(JSON.parse(localStorage.getItem("phimhub-watchlist-v2") ?? "[]")).toHaveLength(1);

    fireEvent.click(screen.getByText("clear"));
    expect(screen.getByText("0").textContent).toBe("0");
    expect(JSON.parse(localStorage.getItem("phimhub-watchlist-v2") ?? "[]")).toEqual([]);
  });
});

describe("movie carousel", () => {
  it("renders more cards as the user approaches the end of the current batch", async () => {
    const movies = Array.from({ length: 25 }, (_, index) => ({
      ...movie,
      id: `movie-${index}`,
      slug: `movie-${index}`,
      title: `Movie ${index}`,
    }));
    const { container } = renderWithMovieProviders(
      <MovieRow title="Popular" movies={movies} />,
    );

    await vi.waitFor(() => expect(container.querySelectorAll("article")).toHaveLength(6));
    const row = container.querySelector<HTMLElement>(".overflow-x-auto");
    expect(row).toBeTruthy();
    Object.defineProperties(row, {
      clientWidth: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 1400 },
      scrollLeft: { configurable: true, value: 1000 },
    });

    fireEvent.scroll(row!);
    await vi.waitFor(() => expect(container.querySelectorAll("article")).toHaveLength(12));
  });
});

describe("watch history", () => {
  it("stores playback time and duration and can clear history", () => {
    render(
      <WatchHistoryProvider>
        <WatchHistoryHarness />
      </WatchHistoryProvider>,
    );

    fireEvent.click(screen.getByText("save progress"));
    const stored = JSON.parse(localStorage.getItem("phimhub_continue_watching_v1") ?? "[]");
    expect(stored[0]).toMatchObject({ currentTime: 321, duration: 5400 });
    expect(screen.getByText("1").textContent).toBe("1");

    fireEvent.click(screen.getByText("clear history"));
    expect(screen.getByText("0").textContent).toBe("0");
  });
});

describe("player settings", () => {
  it("explains the limits of the embedded player", () => {
    render(
      <VideoPlayer
        title="Test Movie"
        m3u8Url="https://example.test/stream.m3u8"
        embedUrl="https://example.test/player"
        preferEmbed
      />,
    );

    expect(screen.getByText(/Embed: chất lượng\/tốc độ do nguồn quản lý/)).toBeTruthy();
  });

  it("closes the settings menu when clicking outside", () => {
    render(<VideoPlayer title="Test Movie" />);
    fireEvent.click(screen.getByTitle("Cài đặt phát video"));
    expect(screen.getByText("Cài đặt phát video")).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Cài đặt phát video")).toBeNull();
  });

  it("closes the settings menu when pressing Escape", () => {
    render(<VideoPlayer title="Test Movie" />);
    fireEvent.click(screen.getByTitle("Cài đặt phát video"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText("Cài đặt phát video")).toBeNull();
  });

  it("seeks forward 10s and shows feedback when double tapping the right side", () => {
    render(<VideoPlayer title="Test Movie" initialTime={30} />);
    const surface = screen.getByTestId("video-gesture-surface");

    // Double tap right (clientX = 650)
    fireEvent.click(surface, { clientX: 650 });
    fireEvent.click(surface, { clientX: 650 });

    expect(screen.getByTestId("double-tap-right-feedback")).toBeTruthy();
    expect(screen.getByText("+10s")).toBeTruthy();
    expect(screen.getByText("Tua 10 giây")).toBeTruthy();
  });

  it("seeks backward 10s and shows feedback when double tapping the left side", () => {
    render(<VideoPlayer title="Test Movie" initialTime={30} />);
    const surface = screen.getByTestId("video-gesture-surface");

    // Double tap left (clientX = 100)
    fireEvent.click(surface, { clientX: 100 });
    fireEvent.click(surface, { clientX: 100 });

    expect(screen.getByTestId("double-tap-left-feedback")).toBeTruthy();
    expect(screen.getByText("-10s")).toBeTruthy();
    expect(screen.getByText("Lùi 10 giây")).toBeTruthy();
  });

  it("supports touch double tap and accumulates seek on subsequent taps", () => {
    render(<VideoPlayer title="Test Movie" initialTime={30} />);
    const surface = screen.getByTestId("video-gesture-surface");

    // Touch tap 1
    fireEvent.touchStart(surface, { touches: [{ clientX: 600, clientY: 100 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 600, clientY: 100 }] });

    // Touch tap 2
    fireEvent.touchStart(surface, { touches: [{ clientX: 600, clientY: 100 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 600, clientY: 100 }] });

    expect(screen.getByTestId("double-tap-right-feedback")).toBeTruthy();
    expect(screen.getByText("+10s")).toBeTruthy();

    // Touch tap 3 (burst continues: +10s more -> +20s)
    fireEvent.touchStart(surface, { touches: [{ clientX: 600, clientY: 100 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 600, clientY: 100 }] });

    expect(screen.getByText("+20s")).toBeTruthy();
    expect(screen.getByText("Tua 20 giây")).toBeTruthy();
  });

  it("toggles play/pause on single click on gesture surface without requiring a second click", async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async () => {});
    render(<VideoPlayer title="Test Movie" initialTime={10} />);
    const surface = screen.getByTestId("video-gesture-surface");

    // Single click
    fireEvent.click(surface, { clientX: 200 });

    // Single click executes togglePlay after single tap timeout
    await vi.waitFor(() => {
      expect(playSpy).toHaveBeenCalled();
    });
    playSpy.mockRestore();
  });

  it("renders the draggable AssistiveTouch lock button when locked and unlocks on tap", () => {
    render(<VideoPlayer title="Test Movie" initialTime={10} />);
    
    // Lock the screen
    fireEvent.click(screen.getByTitle("Khóa màn hình"));
    expect(screen.getByText("Đã khóa màn hình")).toBeTruthy();

    const lockButton = screen.getByTestId("assistive-lock-button");
    expect(lockButton).toBeTruthy();
    expect(screen.getByLabelText("Mở khóa màn hình")).toBeTruthy();

    // Drag the button
    fireEvent.pointerDown(lockButton, { clientX: 20, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(lockButton, { clientX: 180, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(lockButton, { clientX: 180, clientY: 220, pointerId: 1 });

    // It is still locked after dragging (did not unlock while dragging)
    expect(screen.getByTestId("assistive-lock-button")).toBeTruthy();

    // Tap without dragging unlocks the screen
    fireEvent.pointerDown(lockButton, { clientX: 180, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(lockButton, { clientX: 180, clientY: 220, pointerId: 1 });
    expect(screen.getByText("Đã mở khóa màn hình")).toBeTruthy();
    expect(screen.queryByTestId("assistive-lock-button")).toBeNull();
  });
});

describe("IMDb metadata", () => {
  it("uses shared API caching and retry defaults", () => {
    expect(queryClient.getDefaultOptions().queries).toMatchObject({
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });
  });

  it("uses a known IMDb title URL and safely falls back to title search", () => {
    expect(getImdbUrl({ title: "Test", imdbId: "tt1234567" })).toBe(
      "https://www.imdb.com/title/tt1234567/",
    );
    expect(getImdbUrl({ title: "Test Movie", year: 2025 })).toBe(
      "https://www.imdb.com/find/?q=Test%20Movie%202025",
    );
    expect(
      getImdbUrl({ title: "Test Movie", imdbUrl: "https://example.test/title/tt1234567/" }),
    ).toContain("/find/?q=");
  });

  it("shows only valid scores explicitly provided by movie metadata", () => {
    expect(parseImdbRating("8.4/10")).toBe(8.4);
    expect(parseImdbRating("N/A")).toBeUndefined();
    expect(parseImdbRating(11)).toBeUndefined();

    const phimApiMovie = mapPhimApiMovie({
      name: "Test",
      slug: "test",
      imdb: { id: "tt1234567", rating: "7.9" },
    });
    expect(phimApiMovie.imdbId).toBe("tt1234567");
    expect(phimApiMovie.imdbRating).toBe(7.9);

    const nguonCMovie = mapNguonCMovie({
      name: "Test",
      slug: "test",
      imdb: { id: "tt7654321", url: "https://www.imdb.com/title/tt7654321/", rating: 8.1 },
    });
    expect(nguonCMovie.imdbUrl).toContain("tt7654321");
    expect(nguonCMovie.imdbRating).toBe(8.1);
  });

  it("loads an IMDb rating using an existing IMDb ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { imdbRating: "9.3" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getImdbMetadata({ ...movie, imdbId: "tt0111161" }),
    ).resolves.toEqual({ imdbId: "tt0111161", rating: 9.3 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://v3-cinemeta.strem.io/meta/movie/tt0111161.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("matches Cinemeta search results by title and year before loading a rating", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metas: [
            { id: "tt1111111", name: "The Shawshank Redemption", releaseInfo: "1993" },
            { id: "tt0111161", name: "The Shawshank Redemption", releaseInfo: "1994" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ meta: { imdbRating: "9.3" } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getImdbMetadata({
        ...movie,
        title: "Nhà tù Shawshank",
        originalTitle: "The Shawshank Redemption",
        year: 1994,
      }),
    ).resolves.toEqual({ imdbId: "tt0111161", rating: 9.3 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the movie type instead of a missing IMDb rating on cards", () => {
    renderWithMovieProviders(<MovieCard movie={movie} />);

    expect(screen.getByText("Phim lẻ")).toBeTruthy();
    expect(screen.queryByText("IMDb")).toBeNull();
    expect(screen.queryByText("Chưa có điểm")).toBeNull();
  });

  it("shows IMDb and the score together when a rating is available", () => {
    renderWithMovieProviders(
      <MovieCard movie={{ ...movie, imdbId: "tt0111161", imdbRating: 9.3 }} />,
    );

    expect(screen.getByText("IMDb")).toBeTruthy();
    expect(screen.getByText("9.3/10")).toBeTruthy();
    expect(screen.queryByText("Phim lẻ")).toBeNull();
  });
});

describe("Not found page", () => {
  it("offers navigation back into the app", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Không tìm thấy cảnh này")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Trang chủ/ }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: /Tìm phim/ }).getAttribute("href")).toBe("/search");
  });
});
