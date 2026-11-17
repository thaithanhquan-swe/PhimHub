import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getFilteredCatalog, setActiveProvider } from "@/services/movieApi";

describe("Catalog Filter System", () => {
  beforeEach(() => {
    setActiveProvider("phimapi");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters with combined type, genre, country, and year on PhimAPI", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          items: [
            {
              name: "Hoàng Hậu Tái Hôn",
              slug: "hoang-hau-tai-hon",
              origin_name: "Remarried Empress",
              type: "series",
              quality: "HD",
              lang: "Vietsub",
              episode_current: "Tập 16",
              year: 2024,
              category: [{ id: "1", name: "Cổ Trang", slug: "co-trang" }],
              country: [{ id: "2", name: "Hàn Quốc", slug: "han-quoc" }],
            },
          ],
          params: {
            pagination: {
              totalItems: 43,
              totalItemsPerPage: 24,
              currentPage: 1,
              totalPages: 2,
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFilteredCatalog({
      type: "tv",
      genre: "co-trang",
      country: "han-quoc",
      year: 2024,
      page: 1,
    });

    expect(result.provider).toBe("phimapi");
    expect(result.totalItems).toBe(43);
    expect(result.movies).toHaveLength(1);
    expect(result.movies[0].title).toBe("Hoàng Hậu Tái Hôn");

    // Verify requested URL contains ALL filter query parameters
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe("/v1/api/danh-sach/phim-bo");
    expect(calledUrl.searchParams.get("category")).toBe("co-trang");
    expect(calledUrl.searchParams.get("country")).toBe("han-quoc");
    expect(calledUrl.searchParams.get("year")).toBe("2024");
    expect(calledUrl.searchParams.get("page")).toBe("1");
  });

  it("correctly maps khoa-hoc-vien-tuong to vien-tuong on PhimAPI", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          items: [],
          params: {
            pagination: { totalItems: 0, totalPages: 1, currentPage: 1, totalItemsPerPage: 24 },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getFilteredCatalog({
      type: "movie",
      genre: "khoa-hoc-vien-tuong",
      country: "au-my",
    });

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe("/v1/api/danh-sach/phim-le");
    expect(calledUrl.searchParams.get("category")).toBe("vien-tuong");
    expect(calledUrl.searchParams.get("country")).toBe("au-my");
  });

  it("filters out mismatched titles on NguonC fallback when multiple criteria are specified", async () => {
    setActiveProvider("nguonc");

    const fetchMock = vi
      .fn()
      // Initial list call: Korean movies
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          paginate: { current_page: 1, total_page: 10, total_items: 2200 },
          items: [
            {
              name: "Họa Sĩ Gió",
              slug: "hoa-si-gio",
              total_episodes: 20,
              current_episode: "Tập 20",
              year: "2008",
            },
            {
              name: "Hạ Cánh Nơi Anh",
              slug: "ha-canh-noi-anh",
              total_episodes: 16,
              current_episode: "Tập 16",
              year: "2020",
            },
          ],
        }),
      })
      // Detail for Họa Sĩ Gió (Cổ Trang)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          movie: {
            category: {
              "1": { group: { name: "Thể loại" }, list: [{ name: "Cổ Trang" }] },
              "2": { group: { name: "Quốc gia" }, list: [{ name: "Hàn Quốc" }] },
            },
          },
        }),
      })
      // Detail for Hạ Cánh Nơi Anh (Tình Cảm)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          movie: {
            category: {
              "1": { group: { name: "Thể loại" }, list: [{ name: "Tình Cảm" }] },
              "2": { group: { name: "Quốc gia" }, list: [{ name: "Hàn Quốc" }] },
            },
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await getFilteredCatalog({
      type: "tv",
      genre: "co-trang",
      country: "han-quoc",
    });

    expect(result.provider).toBe("nguonc");
    // Only Họa Sĩ Gió matches Cổ Trang
    expect(result.movies).toHaveLength(1);
    expect(result.movies[0].title).toBe("Họa Sĩ Gió");
  });
});

