import Hls, {
  type LoaderCallbacks,
  type LoaderConfiguration,
  type PlaylistLoaderContext,
} from "hls.js";

/**
 * Checks if a given media segment URL is an injected advertisement.
 * Covers all known ad-injection patterns from movie providers & CDNs:
 * - convertvX / convert directories (e.g. convertv7, convertv9, convert)
 * - Dynamic /vX/<hash>/segment_XXXX.ts chunks (e.g. /v9/<hash>/segment_0001.ts, /v7/...)
 * - Explicit segment_XXXX.ts files
 * - Ad / banner / promo / sponsor / betting filenames
 * - Known external ad networks, tracking platforms, and gambling domains
 */
export function isAdSegmentUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return false;
  }

  // 1. Common CDN ad-injection folders (convertv7, convertv9, convert, converted, etc.)
  if (/(?:^|\/)convert(?:v\d*|[_-]|\/)/i.test(trimmed)) {
    return true;
  }

  // 2. MD5 / hashed video ad paths (/v9/<hash>/segment_xxxx.ts, /v7/..., /v8/..., etc.)
  if (/(?:^|\/)v\d+\/[a-f0-9]{8,}\//i.test(trimmed)) {
    return true;
  }
  if (/(?:^|\/)v\d+\/.*segment_\d+\.ts/i.test(trimmed)) {
    return true;
  }

  // 3. Ad-specific filenames and segment naming patterns
  if (
    /(?:^|\/)(?:segment_\d+|ads?|adv|advert|banner|quang[-_]?cao|popunder|midroll|preroll|postroll|sponsor|promo|interstitial)[-_.]/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/^segment_\d+\.ts$/i.test(trimmed)) {
    return true;
  }

  // 4. Absolute URLs from known ad networks, trackers, or gambling platforms
  if (/^https?:\/\//i.test(trimmed)) {
    if (
      /(?:doubleclick|googleads|googlesyndication|adnxs|adsystem|adskeeper|adsterra|propellerads|trafficjunky|exoclick|1999\.ai|88bet|fb88|kubet|w88|fun88|bk8|shbet|new88|jun88|hi88|789bet|f8bet|okvip|sin88|may88|debet|red88|five88|zbet|oxbet|taixiu|nohu|banca|gamebai|casino|betting|adserver)/i.test(
        trimmed,
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Strips advertisement segments from an HLS (.m3u8) playlist.
 * Automatically cleans up accompanying discontinuity tags, ad keys,
 * SCTE-35 / CUE markers, and maintains continuous, stutter-free playback.
 */
export function cleanHlsPlaylist(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  // Only process valid HLS content
  if (!text.includes("#EXTM3U")) {
    return text;
  }

  // Do not modify master / multivariant playlists (they contain #EXT-X-STREAM-INF, not #EXTINF)
  if (text.includes("#EXT-X-STREAM-INF") && !text.includes("#EXTINF:")) {
    return text;
  }

  const lines = text.split("\n");
  const result: string[] = [];
  let pendingTags: string[] = [];
  let pendingDiscontinuity = false;
  let skippedAd = false;
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
      trimmed.startsWith("#EXT-X-KEY:")
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

  return result.join("\n");
}

/**
 * Custom Hls.js Playlist Loader that intercepts playlist requests
 * and strips injected ad segments before Hls.js parses level fragments.
 */
export class PlaylistAdBlockLoader extends (Hls.DefaultConfig.loader as any) {
  load(
    context: PlaylistLoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<PlaylistLoaderContext>,
  ) {
    const originalSuccess = callbacks.onSuccess;
    callbacks.onSuccess = (response, stats, ctx, networkDetails) => {
      if (typeof response.data === "string") {
        response.data = cleanHlsPlaylist(response.data);
      }
      originalSuccess.call(this, response, stats, ctx, networkDetails);
    };

    super.load(context, config, callbacks);
  }
}
