import Hls from "hls.js";
import { describe, expect, it } from "vitest";
import { cleanHlsPlaylist, isAdSegmentUrl } from "@/lib/adBlockPlaylist";

describe("AdBlock Playlist Filter", () => {
  it("detects various ad segment patterns correctly", () => {
    // Should identify ads
    expect(isAdSegmentUrl("convertv9/CQvNBUVa.ts")).toBe(true);
    expect(isAdSegmentUrl("convertv7/TAAUMVUF.ts")).toBe(true);
    expect(isAdSegmentUrl("/v9/d3b54219ece57fa7c8af6d2076384ce0/segment_0001.ts")).toBe(true);
    expect(isAdSegmentUrl("segment_0008.ts")).toBe(true);
    expect(isAdSegmentUrl("quangcao_1.ts")).toBe(true);
    expect(isAdSegmentUrl("ad_banner.ts")).toBe(true);
    expect(isAdSegmentUrl("https://1999.ai/ad.ts")).toBe(true);
    expect(isAdSegmentUrl("https://doubleclick.net/video.ts")).toBe(true);
    expect(isAdSegmentUrl("https://fb88.com/stream/ad.ts")).toBe(true);
    expect(isAdSegmentUrl("https://okvip.media/clip.ts")).toBe(true);
    expect(isAdSegmentUrl("convert_ads/ad1.ts")).toBe(true);
    expect(isAdSegmentUrl("/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0001.ts")).toBe(true);

    // Should NOT identify genuine movie segments
    expect(isAdSegmentUrl("2JHBFPyd.ts")).toBe(false);
    expect(isAdSegmentUrl("99wPBXm2.ts")).toBe(false);
    expect(isAdSegmentUrl("vWfVia8f.ts")).toBe(false);
    expect(isAdSegmentUrl("ak4K4adp.ts")).toBe(false); // contains 'ad' in random hash
    expect(isAdSegmentUrl("ep1_001.ts")).toBe(false);
    expect(isAdSegmentUrl("chunk-1080p-001.ts")).toBe(false);
  });

  it("removes preroll ads without leaving orphan discontinuities", () => {
    const raw = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:6",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:5.0,",
      "convertv9/ad1.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:4.0,",
      "movie1.ts",
      "#EXTINF:4.0,",
      "movie2.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const cleaned = cleanHlsPlaylist(raw);
    expect(cleaned).not.toContain("convertv9/ad1.ts");
    expect(cleaned).toContain("movie1.ts");
    expect(cleaned).toContain("movie2.ts");
    // Preroll should not have a leading discontinuity before the first movie segment
    expect(cleaned).not.toContain("#EXT-X-DISCONTINUITY");
  });

  it("removes midroll ads and preserves exactly one discontinuity for seamless playback", () => {
    const raw = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:6",
      "#EXTINF:4.0,",
      "movie1.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:3.0,",
      "convertv9/ad1.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:3.0,",
      "convertv9/ad2.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:4.0,",
      "movie2.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const cleaned = cleanHlsPlaylist(raw);
    expect(cleaned).not.toContain("convertv9");
    expect(cleaned).toContain("movie1.ts");
    expect(cleaned).toContain("movie2.ts");

    const lines = cleaned.split("\n").filter((l) => l.trim() === "#EXT-X-DISCONTINUITY");
    expect(lines.length).toBe(1);
  });

  it("removes SCTE-35 and CUE-OUT ad blocks completely", () => {
    const raw = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXTINF:4.0,",
      "movie1.ts",
      "#EXT-X-CUE-OUT:DURATION=30",
      "#EXTINF:10.0,",
      "unknown_hash_123.ts",
      "#EXTINF:10.0,",
      "unknown_hash_456.ts",
      "#EXT-X-CUE-IN",
      "#EXTINF:4.0,",
      "movie2.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const cleaned = cleanHlsPlaylist(raw);
    expect(cleaned).not.toContain("unknown_hash");
    expect(cleaned).toContain("movie1.ts");
    expect(cleaned).toContain("movie2.ts");
  });

  it("leaves master multi-variant playlists unchanged", () => {
    const master = [
      "#EXTM3U",
      "#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=3500000,RESOLUTION=1920x1080",
      "3500kb/hls/index.m3u8",
      "#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1500000,RESOLUTION=1280x720",
      "1500kb/hls/index.m3u8",
    ].join("\n");

    expect(cleanHlsPlaylist(master)).toBe(master);
  });

  it("completely strips the 1999.ai casino ads from Việc Ma, Lương Quái tập 2", () => {
    const snippet = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:7",
      "#EXTINF:6.56,",
      "tO50yWER.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:3.12,",
      "convertv9/CQvNBUVa.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:3.96,",
      "convertv9/8GI0vLyC.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:4.28,",
      "99wPBXm2.ts",
      "#EXTINF:4.72,",
      "o2F0lnSG.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXT-X-KEY:METHOD=NONE",
      "#EXTINF:5.833,",
      "/v9/d3b54219ece57fa7c8af6d2076384ce0/segment_0001.ts",
      "#EXTINF:3.367,",
      "/v9/d3b54219ece57fa7c8af6d2076384ce0/segment_0008.ts",
      "#EXTINF:2.0,",
      "/v9/d3b54219ece57fa7c8af6d2076384ce0/segment_0009.ts",
      "#EXT-X-DISCONTINUITY",
      "#EXTINF:3.12,",
      "vWfVia8f.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const cleaned = cleanHlsPlaylist(snippet);
    expect(cleaned).not.toContain("convertv9");
    expect(cleaned).not.toContain("/v9/");
    expect(cleaned).not.toContain("METHOD=NONE");
    expect(cleaned).toContain("tO50yWER.ts");
    expect(cleaned).toContain("99wPBXm2.ts");
    expect(cleaned).toContain("o2F0lnSG.ts");
    expect(cleaned).toContain("vWfVia8f.ts");

    const discontinuities = cleaned.split("\n").filter((l) => l.trim() === "#EXT-X-DISCONTINUITY");
    // Exactly 2 discontinuities: one between tO50yWER & 99wPBXm2, and one between o2F0lnSG & vWfVia8f
    expect(discontinuities.length).toBe(2);
  });

  it("PlaylistAdBlockLoader intercepts playlist response and cleans it", () => {
    const loader = new (class extends (Hls.DefaultConfig.loader as any) {
      constructor(cfg: any) {
        super(cfg);
      }
      load(context: any, _config: any, callbacks: any) {
        const origSuccess = callbacks.onSuccess;
        callbacks.onSuccess = (response: any, stats: any, ctx: any, networkDetails: any) => {
          if (typeof response.data === "string") {
            response.data = cleanHlsPlaylist(response.data);
          }
          origSuccess.call(this, response, stats, ctx, networkDetails);
        };
        // Simulate immediate response
        callbacks.onSuccess(
          {
            url: context.url,
            data: "#EXTM3U\n#EXTINF:5.0,\nconvertv9/ad.ts\n#EXTINF:4.0,\npart1.ts\n#EXT-X-ENDLIST",
          },
          {},
          context,
          {},
        );
      }
    })(Hls.DefaultConfig);

    let interceptedData = "";
    loader.load(
      { url: "https://test.com/level.m3u8" },
      {},
      {
        onSuccess: (res: any) => {
          interceptedData = res.data;
        },
      },
    );

    expect(interceptedData).not.toContain("convertv9");
    expect(interceptedData).toContain("part1.ts");
  });
});
