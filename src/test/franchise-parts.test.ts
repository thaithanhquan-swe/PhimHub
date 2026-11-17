import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFranchiseParts,
  parseSeasonInfo,
  setActiveProvider,
} from "@/services/movieApi";

describe("Franchise & Season Parsing System", () => {
  beforeEach(() => {
    setActiveProvider("phimapi");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("correctly parses season numbers, base titles, and strips years and audio tags", () => {
    const s1 = parseSeasonInfo(
      "Penthouse: Cuộc Chiến Thượng Lưu (Phần 2) (2021) (Thuyết Minh)",
      "penthouse-cuoc-chien-thuong-luu-phan-2-2021-vietsub",
    );
    expect(s1.season).toBe(2);
    expect(s1.baseTitle).toBe("Penthouse: Cuộc Chiến Thượng Lưu");
    expect(s1.baseSlug).toBe("penthouse-cuoc-chien-thuong-luu");

    const s2 = parseSeasonInfo("Thần Điêu Đại Hiệp Phần II", "than-dieu-dai-hiep-phan-ii");
    expect(s2.season).toBe(2);
    expect(s2.baseTitle).toBe("Thần Điêu Đại Hiệp");
    expect(s2.baseSlug).toBe("than-dieu-dai-hiep");

    const s3 = parseSeasonInfo("Âm Thanh Tội Phạm 2", "am-thanh-toi-pham-2");
    expect(s3.season).toBe(2);
    expect(s3.baseTitle).toBe("Âm Thanh Tội Phạm");
    expect(s3.baseSlug).toBe("am-thanh-toi-pham");

    const standalone = parseSeasonInfo("Ký Sinh Trùng (2021)", "ky-sinh-trung-2021");
    expect(standalone.season).toBe(null);
    expect(standalone.baseTitle).toBe("Ký Sinh Trùng");
    expect(standalone.baseSlug).toBe("ky-sinh-trung");
  });

  it("filters out unrelated movies and prevents fake duplicate year-labeled parts", async () => {
    // Current movie is Vua Chuyện Bi Hài (Phần 2)
    const currentMovie = {
      title: "Vua Chuyện Bi Hài (Phần 2)",
      slug: "vua-chuyen-bi-hai-phan-2",
      kind: "Series",
    };

    // Mock search returning genuine seasons + unrelated search results matching keywords
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          items: [
            {
              name: "Vua Chuyện Bi Hài (Phần 4)",
              slug: "vua-chuyen-bi-hai-phan-4",
              year: 2026,
            },
            {
              name: "Vua Chuyện Bi Hài (Phần 3)",
              slug: "vua-chuyen-bi-hai-phan-3",
              year: 2024,
            },
            {
              name: "Vua Chuyện Bi Hài (Phần 2)",
              slug: "vua-chuyen-bi-hai-phan-2",
              year: 2023,
            },
            {
              name: "Vua Chuyện Bi Hài (Phần 1)",
              slug: "vua-chuyen-bi-hai-phan-1",
              year: 2022,
            },
            // Unrelated movies that matched keyword "chuyen bi hai" or "2021"
            {
              name: "Chuyện Bi Hài Của Gia Đình Tôi (Phần 2)",
              slug: "chuyen-bi-hai-cua-gia-dinh-toi-phan-2",
              year: 2021,
            },
            {
              name: "Vua Hài Kịch (2021)",
              slug: "vua-hai-kich-2021",
              year: 2021,
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const parts = await getFranchiseParts(currentMovie);

    // Must ONLY contain the 4 genuine seasons of Vua Chuyện Bi Hài
    expect(parts).toHaveLength(4);
    expect(parts.map((p) => p.partLabel)).toEqual(["Phần 1", "Phần 2", "Phần 3", "Phần 4"]);
    expect(parts.map((p) => p.slug)).toEqual([
      "vua-chuyen-bi-hai-phan-1",
      "vua-chuyen-bi-hai-phan-2",
      "vua-chuyen-bi-hai-phan-3",
      "vua-chuyen-bi-hai-phan-4",
    ]);

    // Current part must be Phần 2
    const currentPart = parts.find((p) => p.isCurrent);
    expect(currentPart).toBeDefined();
    expect(currentPart?.partLabel).toBe("Phần 2");
    expect(currentPart?.slug).toBe("vua-chuyen-bi-hai-phan-2");

    // Must NEVER contain fake duplicate year tags like "Phần 2 (2021)"
    expect(parts.some((p) => p.partLabel.includes("(2021)"))).toBe(false);
    expect(parts.some((p) => p.slug === "chuyen-bi-hai-cua-gia-dinh-toi-phan-2")).toBe(false);
  });

  it("returns empty array for standalone movies even if keyword search returns movies", async () => {
    const standaloneMovie = {
      title: "Ký Sinh Trùng",
      slug: "ky-sinh-trung",
      kind: "Single",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          items: [
            {
              name: "Ký Sinh Trùng (2019)",
              slug: "ky-sinh-trung-2019",
              year: 2019,
            },
            {
              name: "Ký Sinh Thú: Điểm Xám (Phần 2)",
              slug: "ky-sinh-thu-diem-xam-phan-2",
              year: 2024,
            },
            {
              name: "Quái Vật Ký Sinh",
              slug: "quai-vat-ky-sinh",
              year: 2021,
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const parts = await getFranchiseParts(standaloneMovie);

    // Standalone movie must NOT show franchise buttons!
    expect(parts).toEqual([]);
  });
});
