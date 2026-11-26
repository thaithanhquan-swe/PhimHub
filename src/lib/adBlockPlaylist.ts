import Hls, {
  type LoaderCallbacks,
  type LoaderConfiguration,
  type PlaylistLoaderContext,
} from "hls.js";
import { getOfflineDownload, getOfflineSegment } from "@/services/offlineStorage";

function makeHlsLoaderStats(loadedBytes: number = 0) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    aborted: false,
    loaded: loadedBytes,
    retry: 0,
    total: loadedBytes,
    chunkCount: 1,
    bwEstimate: 50000000,
    loading: {
      start: now - 10,
      first: now - 5,
      end: now,
    },
    parsing: {
      start: now,
      end: now,
    },
    buffering: {
      start: now,
      first: now,
      end: now,
    },
  };
}

/**
 * Checks if a given media segment URL is an injected advertisement.
 * Covers all known ad-injection patterns from movie providers & CDNs:
 * - convertvX / convert / converted directories (e.g. convertv7, convertv9, convert, converted, convert-ads)
 * - Dynamic /vX/<hash>/segment_XXXX.ts chunks (e.g. /v9/<hash>/segment_0001.ts, /v7/...)
 * - Explicit segment_XXXX.ts or segmentXXXX.ts files
 * - Ad / banner / promo / sponsor / betting filenames or Vietnamese abbreviations (qc, quangcao, khuyenmai)
 * - Known external ad networks, tracking platforms, and gambling brands (checked in domain, path, or filename)
 */
export function isAdSegmentUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return false;
  }

  // 1. Common CDN ad-injection folders (convertv7, convertv9, convert, converted, convert1, convert-ads, etc.)
  if (/(?:^|\/)convert(?:v?\d*|ed|[_-]|\/|$)/i.test(trimmed)) {
    return true;
  }

  // 2. MD5 / hashed video ad paths (/v9/<hex_hash>/..., /v7/.../segment_xxxx.ts, etc.)
  // Avoid matching normal movie CDN versioned folders like /v2/movie_slug_2025/0001.ts
  if (/(?:^|\/)v\d+\/(?:[a-f0-9]{16,}\/|[^/]*(?:seg(?:ment)?[-_]?\d+|ad|qc))/i.test(trimmed)) {
    return true;
  }

  // 3. Ad-specific filenames, chunks, and segment naming patterns (including Vietnamese ad naming)
  // Requires word boundaries or delimiters (_ or -) for short abbreviations (ad, ads, qc) to prevent false positives
  // on random base62 movie segment hashes (e.g. Ad2pPDzk.ts, qC9gJph3.ts).
  if (
    /(?:^|\/)(?:segment_?\d+|quang[-_]?cao|khuyen[-_]?mai|banner|popunder|midroll|preroll|postroll|sponsor|promo|interstitial)[-_.\d]/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/(?:^|\/)(?:ad|ads|adv|advert|qc)[-_]/i.test(trimmed)) {
    return true;
  }
  if (/^segment_?\d+\.ts$/i.test(trimmed)) {
    return true;
  }

  // 4. Known ad networks, gambling platforms, and betting brands
  // For absolute URLs (http://, https://, //), match domain name or path
  if (/^(?:https?:)?\/\//i.test(trimmed)) {
    if (
      /(?:^|\/\/)(?:[a-z0-9-]+\.)*(?:1999\.?ai|okvip|88bet|fb88|kubet|w88|fun88|bk8|shbet|new88|jun88|hi88|789bet|f8bet|ok9|sin88|may88|debet|red88|five88|zbet|oxbet|taixiu|nohu|banca|gamebai|casino|betting|adserver|adskeeper|adsterra|propellerads|trafficjunky|exoclick|doubleclick|googleads|googlesyndication|adnxs|adsystem)(?:[\/:\.]|$)/i.test(
        trimmed,
      )
    ) {
      return true;
    }
  }

  // For relative filenames/paths, require delimiters (^, /, _, -, .) around brand names
  // to avoid matching random movie hashes containing substrings like 'ok9', 'w88', 'bk8', 'zbet'
  // (e.g. ApW4Ok9f.ts, YW88ZjBZ.ts, deOmBK8l.ts, zbETu8yp.ts)
  if (
    /(?:^|[\/_\.-])(?:1999\.?ai|okvip|88bet|fb88|kubet(?:88)?|w88|fun88|bk8|shbet|new88|jun88|hi88|789bet|f8bet|ok9|sin88|may88|debet|red88|five88|zbet|oxbet|taixiu|nohu|banca|gamebai|casino|betting|adserver|adskeeper|adsterra|propellerads|trafficjunky|exoclick|doubleclick|googleads|googlesyndication|adnxs|adsystem)(?:[\/_\.-]|$)/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  return false;
}

export interface AdRange {
  start: number;
  end: number;
}

export interface DetectedAdInfo {
  hasAd: boolean;
  adDuration: number;
  adRanges: AdRange[];
}

export interface PlaylistFragmentLike {
  start: number;
  duration: number;
  cc?: number;
  url?: string;
  tagList?: string[][];
  hasCueOut?: boolean;
  hasDiscontinuity?: boolean;
}

function mergeAdRanges(ranges: AdRange[]): AdRange[] {
  const valid = ranges
    .map((r) => ({ start: Math.max(0, Math.round(r.start)), end: Math.max(0, Math.round(r.end)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (valid.length <= 1) return valid;

  const merged: AdRange[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = valid[i];
    if (curr.start <= prev.end + 2) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

const MAX_INFERRED_AD_SECONDS = 95;
const MAX_EXPLICIT_AD_SECONDS = 180;
const strippedPrerollUrls = new Set<string>();

function markStrippedPrerollUrl(url?: string) {
  if (!url) return;
  if (strippedPrerollUrls.size >= 50) {
    const oldest = strippedPrerollUrls.values().next().value;
    if (oldest) strippedPrerollUrls.delete(oldest);
  }
  strippedPrerollUrls.add(url);
}

export function hasStrippedPreroll(url?: string): boolean {
  return Boolean(url && strippedPrerollUrls.has(url));
}

/**
 * Analyzes parsed HLS fragments (from Hls.js LEVEL_LOADED or playlist parser)
 * to detect pre-roll and mid-roll ad segments / discontinuity blocks.
 */
export function detectAdFromFragments(
  fragments: PlaylistFragmentLike[],
  url?: string,
  options?: { hadStrippedPreroll?: boolean },
): DetectedAdInfo {
  const isNguonC = Boolean(url && /nguonc/i.test(url)) && !options?.hadStrippedPreroll;

  if (!fragments || fragments.length === 0) {
    return isNguonC
      ? { hasAd: true, adDuration: 85, adRanges: [{ start: 0, end: 85 }] }
      : { hasAd: false, adDuration: 0, adRanges: [] };
  }

  const blocks: Array<{ start: number; end: number; hasAdSegment: boolean }> = [];
  const explicitAdRanges: AdRange[] = [];

  let currentBlock: { start: number; end: number; hasAdSegment: boolean } | null = null;
  let activeExplicitAd: AdRange | null = null;
  let prevCC: number | undefined;

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    const fragStart = Math.max(0, Number.isFinite(frag.start) ? frag.start : 0);
    const fragDuration = Math.max(0, Number.isFinite(frag.duration) ? frag.duration : 0);
    const fragEnd = fragStart + fragDuration;

    const hasDiscTag = Boolean(
      frag.hasDiscontinuity ||
        frag.tagList?.some((tags) => tags.includes("EXT-X-DISCONTINUITY")),
    );
    const ccChanged = i > 0 && frag.cc !== undefined && prevCC !== undefined && frag.cc !== prevCC;
    prevCC = frag.cc;

    if (!currentBlock || (i > 0 && (ccChanged || hasDiscTag))) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { start: fragStart, end: fragEnd, hasAdSegment: false };
    } else {
      currentBlock.end = Math.max(currentBlock.end, fragEnd);
    }

    const isExplicitAd = Boolean(frag.hasCueOut || (frag.url && isAdSegmentUrl(frag.url)));
    if (isExplicitAd) {
      currentBlock.hasAdSegment = true;
      if (!activeExplicitAd) {
        activeExplicitAd = { start: fragStart, end: fragEnd };
      } else {
        activeExplicitAd.end = Math.max(activeExplicitAd.end, fragEnd);
      }
    } else if (activeExplicitAd) {
      explicitAdRanges.push(activeExplicitAd);
      activeExplicitAd = null;
    }
  }

  if (currentBlock) blocks.push(currentBlock);
  if (activeExplicitAd) explicitAdRanges.push(activeExplicitAd);

  const detectedRanges: AdRange[] = [...explicitAdRanges];

  if (blocks.length >= 2) {
    const first = blocks[0];
    const firstDur = first.end - first.start;
    const firstLimit = first.hasAdSegment ? MAX_EXPLICIT_AD_SECONDS : MAX_INFERRED_AD_SECONDS;

    // Pre-roll spliced ad block before first discontinuity (avoid treating long cold opens as ads)
    const looksLikeColdOpenBeforeShortAd =
      !first.hasAdSegment &&
      blocks.length >= 3 &&
      firstDur > 45 &&
      blocks[1].end - blocks[1].start <= MAX_INFERRED_AD_SECONDS;

    if (!looksLikeColdOpenBeforeShortAd && firstDur >= 3 && firstDur <= firstLimit) {
      detectedRanges.push({ start: 0, end: Math.round(first.end) });
    }

    // Interior discontinuity-bracketed blocks anywhere in the video (mid-roll ads / post-cold-open ads)
    for (let k = 1; k < blocks.length - 1; k++) {
      const block = blocks[k];
      const dur = block.end - block.start;
      const limit = block.hasAdSegment ? MAX_EXPLICIT_AD_SECONDS : MAX_INFERRED_AD_SECONDS;
      if (dur >= 3 && dur <= limit) {
        detectedRanges.push({ start: Math.round(block.start), end: Math.round(block.end) });
      }
    }
  }

  const adRanges = mergeAdRanges(detectedRanges);

  if (adRanges.length > 0) {
    return {
      hasAd: true,
      adDuration: adRanges[0].end,
      adRanges,
    };
  }

  if (isNguonC) {
    return {
      hasAd: true,
      adDuration: 85,
      adRanges: [{ start: 0, end: 85 }],
    };
  }

  return {
    hasAd: false,
    adDuration: 0,
    adRanges: [],
  };
}

/**
 * Analyzes an HLS playlist to detect if the stream contains an advertisement
 * and determine its exact duration and time ranges (pre-roll or mid-roll).
 */
export function detectAdFromPlaylist(playlistText: string, url?: string): DetectedAdInfo {
  const isNguonC = Boolean(url && /nguonc/i.test(url));

  if (!playlistText || typeof playlistText !== "string") {
    return isNguonC
      ? { hasAd: true, adDuration: 85, adRanges: [{ start: 0, end: 85 }] }
      : { hasAd: false, adDuration: 0, adRanges: [] };
  }

  // Multivariant master playlist without media segments: fallback to URL check
  if (playlistText.includes("#EXT-X-STREAM-INF") && !playlistText.includes("#EXTINF:")) {
    return isNguonC
      ? { hasAd: true, adDuration: 85, adRanges: [{ start: 0, end: 85 }] }
      : { hasAd: false, adDuration: 0, adRanges: [] };
  }

  const lines = playlistText.split("\n");
  const fragments: PlaylistFragmentLike[] = [];
  let accumulatedTime = 0;
  let currentSegmentDuration = 0;
  let pendingDiscontinuity = false;
  let inCueOutBlock = false;
  let currentCC = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#EXTINF:")) {
      const match = trimmed.match(/#EXTINF:([\d.]+)/);
      if (match) {
        currentSegmentDuration = parseFloat(match[1]);
      }
      continue;
    }

    if (trimmed === "#EXT-X-DISCONTINUITY") {
      pendingDiscontinuity = true;
      currentCC++;
      continue;
    }

    if (trimmed.startsWith("#EXT-X-CUE-OUT") || trimmed.startsWith("#EXT-OATCLS-SCTE35")) {
      inCueOutBlock = true;
      continue;
    }

    if (trimmed.startsWith("#EXT-X-CUE-IN")) {
      inCueOutBlock = false;
      continue;
    }

    if (!trimmed.startsWith("#")) {
      fragments.push({
        start: accumulatedTime,
        duration: currentSegmentDuration,
        cc: currentCC,
        url: trimmed,
        hasCueOut: inCueOutBlock,
        hasDiscontinuity: pendingDiscontinuity,
      });
      accumulatedTime += currentSegmentDuration;
      currentSegmentDuration = 0;
      pendingDiscontinuity = false;
    }
  }

  return detectAdFromFragments(fragments, url);
}

/**
 * Strips advertisement segments from an HLS (.m3u8) playlist.
 * Automatically cleans up accompanying discontinuity tags, ad keys,
 * SCTE-35 / CUE markers, and maintains continuous, stutter-free playback.
 */
export function cleanHlsPlaylistWithInfo(text: string): {
  text: string;
  strippedPreroll: boolean;
} {
  if (!text || typeof text !== "string") {
    return { text, strippedPreroll: false };
  }

  // Only process valid HLS content
  if (!text.includes("#EXTM3U")) {
    return { text, strippedPreroll: false };
  }

  // Do not modify master / multivariant playlists (they contain #EXT-X-STREAM-INF, not #EXTINF)
  if (text.includes("#EXT-X-STREAM-INF") && !text.includes("#EXTINF:")) {
    return { text, strippedPreroll: false };
  }

  const lines = text.split("\n");
  const result: string[] = [];
  let pendingTags: string[] = [];
  let pendingDiscontinuity = false;
  let skippedAd = false;
  let strippedPreroll = false;
  let hasEmittedFirstSegment = false;
  let inCueOutBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    // Handle SCTE-35 / CUE-OUT ad break boundaries
    if (
      trimmed.startsWith("#EXT-X-CUE-OUT") ||
      trimmed.startsWith("#EXT-OATCLS-SCTE35") ||
      trimmed.startsWith("#EXT-X-DATERANGE") && /CLASS="com\.apple\.hls\.interstitial"|X-AD-ID|SCTE35/i.test(trimmed)
    ) {
      inCueOutBlock = true;
      skippedAd = true;
      if (!hasEmittedFirstSegment) strippedPreroll = true;
      pendingTags = [];
      continue;
    }
    if (trimmed.startsWith("#EXT-X-CUE-IN")) {
      inCueOutBlock = false;
      continue;
    }

    // Handle discontinuity flags
    if (trimmed === "#EXT-X-DISCONTINUITY") {
      pendingDiscontinuity = true;
      continue;
    }

    // Accumulate tags belonging to the upcoming segment
    if (
      trimmed.startsWith("#EXTINF:") ||
      trimmed.startsWith("#EXT-X-BYTERANGE:") ||
      trimmed.startsWith("#EXT-X-PROGRAM-DATE-TIME:") ||
      trimmed.startsWith("#EXT-X-KEY:") ||
      trimmed.startsWith("#EXT-X-MAP:")
    ) {
      pendingTags.push(rawLine);
      continue;
    }

    // Media segment URI line (not starting with '#')
    if (!trimmed.startsWith("#")) {
      const isAd = inCueOutBlock || isAdSegmentUrl(trimmed);
      if (isAd) {
        // Discard ad segment and any associated tags (e.g. ad duration, temporary key reset)
        pendingTags = [];
        skippedAd = true;
        if (!hasEmittedFirstSegment) strippedPreroll = true;
        continue;
      }

      // Valid movie segment encountered
      // If we previously bypassed an ad (midroll) or had a genuine discontinuity,
      // emit exactly one #EXT-X-DISCONTINUITY to instruct Hls.js demuxer to align PTS
      if ((pendingDiscontinuity || skippedAd) && hasEmittedFirstSegment) {
        result.push("#EXT-X-DISCONTINUITY");
      }
      pendingDiscontinuity = false;
      skippedAd = false;

      // Flush stored legitimate tags
      if (pendingTags.length > 0) {
        result.push(...pendingTags);
        pendingTags = [];
      }
      result.push(rawLine);
      hasEmittedFirstSegment = true;
      continue;
    }

    // Other top-level or playlist headers (e.g. #EXTM3U, #EXT-X-VERSION, #EXT-X-TARGETDURATION, #EXT-X-ENDLIST)
    result.push(rawLine);
  }

  // Safety guard: if the original media playlist had segments, never return an empty 0-segment playlist
  // due to an aggressive ad pattern match (which would cause Hls.js to spin forever).
  if (!hasEmittedFirstSegment && text.includes("#EXTINF:")) {
    return { text, strippedPreroll: false };
  }

  return { text: result.join("\n"), strippedPreroll };
}

export function cleanHlsPlaylist(text: string): string {
  return cleanHlsPlaylistWithInfo(text).text;
}

/**
 * Custom Hls.js Playlist and Fragment Loader that:
 * 1. Intercepts offline requests (offline:// and offline-segment://) and retrieves video from IndexedDB.
 * 2. Intercepts online playlist requests and strips injected ad segments before Hls.js parses level fragments.
 */
export class PlaylistAdBlockLoader extends (Hls.DefaultConfig.loader as any) {
  private _aborted = false;

  load(
    context: PlaylistLoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<PlaylistLoaderContext>,
  ) {
    this._aborted = false;

    // Handle offline master / media playlist requests
    if (context.url && context.url.startsWith("offline://")) {
      const cleanUrl = context.url.split("?")[0].split("#")[0];
      const downloadId = cleanUrl.replace(/^offline:\/\//, "").replace(/\/+$/, "");

      getOfflineDownload(downloadId)
        .then((item) => {
          if (this._aborted) return;
          if (!item || !item.playlistText) {
            const errStats = makeHlsLoaderStats(0);
            callbacks.onError(
              { code: 404, text: "Không tìm thấy dữ liệu phát offline" },
              context,
              null as any,
              errStats as any,
            );
            return;
          }

          let data = item.playlistText;
          // Ensure valid VOD tags if not present
          if (!data.includes("#EXT-X-PLAYLIST-TYPE")) {
            data = data.replace("#EXTM3U", "#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD");
          }
          if (!data.includes("#EXT-X-ENDLIST")) {
            data += "\n#EXT-X-ENDLIST";
          }

          const byteLength = data.length;
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const stats = (this.stats && typeof this.stats === "object") ? this.stats : makeHlsLoaderStats(byteLength);
          if (!stats.loading) {
            stats.loading = { start: now - 10, first: now - 5, end: now };
          }
          stats.loading.start = stats.loading.start || (now - 10);
          stats.loading.first = stats.loading.first || (now - 5);
          stats.loading.end = now;
          stats.loaded = byteLength;
          stats.total = byteLength;
          stats.bwEstimate = 50000000;

          callbacks.onSuccess({ url: context.url, data }, stats as any, context, null as any);
        })
        .catch((err) => {
          if (this._aborted) return;
          const errStats = makeHlsLoaderStats(0);
          callbacks.onError(
            { code: 500, text: err?.message || "Lỗi tải playlist offline" },
            context,
            null as any,
            errStats as any,
          );
        });
      return;
    }

    // Handle offline fragment (TS chunk) requests from IndexedDB
    if (context.url && context.url.startsWith("offline-segment://")) {
      const cleanUrl = context.url.split("?")[0].split("#")[0];
      const withoutPrefix = cleanUrl.replace(/^offline-segment:\/\//, "").replace(/\/+$/, "");
      const slashIndex = withoutPrefix.lastIndexOf("/");
      const downloadId = withoutPrefix.substring(0, slashIndex);
      const segmentIndex = parseInt(withoutPrefix.substring(slashIndex + 1), 10);

      getOfflineSegment(downloadId, segmentIndex)
        .then((buffer) => {
          if (this._aborted) return;
          if (!buffer) {
            const errStats = makeHlsLoaderStats(0);
            callbacks.onError(
              { code: 404, text: `Không tìm thấy đoạn video offline #${segmentIndex}` },
              context,
              null as any,
              errStats as any,
            );
            return;
          }

          let arrayBuffer: ArrayBuffer;
          if (buffer instanceof ArrayBuffer) {
            arrayBuffer = buffer;
          } else if (ArrayBuffer.isView(buffer)) {
            const view = buffer as any;
            arrayBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
          } else {
            arrayBuffer = buffer as any;
          }

          const byteLength = arrayBuffer.byteLength || 0;
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const stats = (this.stats && typeof this.stats === "object") ? this.stats : makeHlsLoaderStats(byteLength);
          if (!stats.loading) {
            stats.loading = { start: now - 10, first: now - 5, end: now };
          }
          stats.loading.start = stats.loading.start || (now - 10);
          stats.loading.first = stats.loading.first || (now - 5);
          stats.loading.end = now;
          stats.loaded = byteLength;
          stats.total = byteLength;
          stats.bwEstimate = 50000000;

          callbacks.onSuccess({ url: context.url, data: arrayBuffer }, stats as any, context, null as any);
        })
        .catch((err) => {
          if (this._aborted) return;
          const errStats = makeHlsLoaderStats(0);
          callbacks.onError(
            { code: 500, text: err?.message || "Lỗi tải đoạn video offline" },
            context,
            null as any,
            errStats as any,
          );
        });
      return;
    }

    // Normal online request: clean ad segments if response is playlist string
    const originalSuccess = callbacks.onSuccess;
    callbacks.onSuccess = (response, stats, ctx, networkDetails) => {
      if (typeof response.data === "string") {
        const cleaned = cleanHlsPlaylistWithInfo(response.data);
        if (cleaned.strippedPreroll) {
          markStrippedPrerollUrl(ctx.url);
          markStrippedPrerollUrl(context.url);
        }
        response.data = cleaned.text;
      }
      originalSuccess.call(this, response, stats, ctx, networkDetails);
    };

    super.load(context, config, callbacks);
  }

  abort() {
    this._aborted = true;
    if (typeof super.abort === "function") {
      super.abort();
    }
  }
}

/**
 * Converts all relative segment URIs and key URIs in an HLS playlist to absolute URLs,
 * resolving them against the playlist's base URL.
 */
export function makeHlsUrlsAbsolute(playlistText: string, baseUrl: string): string {
  if (!playlistText || typeof playlistText !== "string") return playlistText;
  const lines = playlistText.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      // Rewrite relative URI="..." in #EXT-X-KEY or #EXT-X-MAP
      if (trimmed.includes('URI="')) {
        const rewritten = trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
          if (!/^https?:\/\//i.test(uri)) {
            try {
              return `URI="${new URL(uri, baseUrl).href}"`;
            } catch {
              return match;
            }
          }
          return match;
        });
        result.push(rewritten);
      } else {
        result.push(line);
      }
    } else {
      // Media segment line
      if (!/^https?:\/\//i.test(trimmed)) {
        try {
          result.push(new URL(trimmed, baseUrl).href);
        } catch {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }
  }

  return result.join("\n");
}

/**
 * Downloads and cleans an HLS playlist for native video players (such as iOS Safari / Apple AVPlayer),
 * returning an ad-free Blob URL where all relative segment URLs have been converted to absolute URLs.
 */
export async function createCleanNativeM3u8Url(
  m3u8Url: string,
  signal?: AbortSignal,
  onAdDetected?: (info: DetectedAdInfo) => void,
): Promise<string> {
  const res = await fetch(m3u8Url, { signal });
  const text = await res.text();

  // If this is a multivariant master playlist, find the best level subplaylist
  if (text.includes("#EXT-X-STREAM-INF") && !text.includes("#EXTINF:")) {
    const lines = text.split("\n");
    let subUrl = "";
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("#EXT-X-STREAM-INF")) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith("#")) {
          subUrl = new URL(nextLine, m3u8Url).href;
          break;
        }
      }
    }
    if (subUrl) {
      const subRes = await fetch(subUrl, { signal });
      const subText = await subRes.text();
      onAdDetected?.(detectAdFromPlaylist(subText, subUrl));
      const cleaned = cleanHlsPlaylist(subText);
      const absoluteCleaned = makeHlsUrlsAbsolute(cleaned, subUrl);
      const blob = new Blob([absoluteCleaned], { type: "application/vnd.apple.mpegurl" });
      return URL.createObjectURL(blob);
    }
  }

  // Already a media playlist
  onAdDetected?.(detectAdFromPlaylist(text, m3u8Url));
  const cleaned = cleanHlsPlaylist(text);
  const absoluteCleaned = makeHlsUrlsAbsolute(cleaned, m3u8Url);
  const blob = new Blob([absoluteCleaned], { type: "application/vnd.apple.mpegurl" });
  return URL.createObjectURL(blob);
}
