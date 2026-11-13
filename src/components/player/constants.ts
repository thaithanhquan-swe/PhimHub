import type { QualityOption } from "./types";

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const AUDIO_BOOST_LEVELS = [
  { val: 1.0, label: "100%", badge: "Tiêu chuẩn" },
  { val: 2.0, label: "200%", badge: "To rõ" },
  { val: 3.0, label: "300%", badge: "Khuyên dùng" },
  { val: 4.0, label: "400%", badge: "Cực đại" },
  { val: 5.0, label: "500%", badge: "Tối đa" },
];

export const AUTO_QUALITY: QualityOption = { index: -1, label: "Tự động (Auto)" };
