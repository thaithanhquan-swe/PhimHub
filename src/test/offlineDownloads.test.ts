import { describe, it, expect } from "vitest";
import { formatBytes, generateDownloadId } from "@/services/offlineStorage";

describe("Offline Storage & Utilities", () => {
  it("generates correct download IDs based on slug and indices", () => {
    const id = generateDownloadId("breaking-bad", 0, 4);
    expect(id).toBe("breaking-bad_s0_e4");

    const id2 = generateDownloadId("one-piece", 1, 100);
    expect(id2).toBe("one-piece_s1_e100");
  });

  it("correctly formats byte sizes to MB and GB", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(-100)).toBe("0 MB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50.0 MB");
    expect(formatBytes(150.5 * 1024 * 1024)).toBe("150.5 MB");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
    expect(formatBytes(12.75 * 1024 * 1024 * 1024)).toBe("12.75 GB");
  });
});
