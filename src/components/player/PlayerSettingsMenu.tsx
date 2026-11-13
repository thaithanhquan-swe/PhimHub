import { Check, ChevronRight, Gauge, Scaling, Volume2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { AUDIO_BOOST_LEVELS, PLAYBACK_SPEEDS } from "./constants";
import type { QualityOption, SettingsTab } from "./types";

interface PlayerSettingsMenuProps {
  isOpen: boolean;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  playbackSpeed: number;
  onSetSpeed: (speed: number) => void;
  qualities: QualityOption[];
  currentQualityIndex: number;
  onSetQuality: (index: number) => void;
  audioBoostFactor: number;
  onSetAudioBoost: (factor: number) => void;
  aspectRatio: "contain" | "cover";
  onToggleAspectRatio: () => void;
  preferM3U8: boolean;
  embedUrl?: string;
  onSwitchToEmbed?: () => void;
}

export function PlayerSettingsMenu({
  isOpen,
  settingsRef,
  activeTab,
  setActiveTab,
  playbackSpeed,
  onSetSpeed,
  qualities,
  currentQualityIndex,
  onSetQuality,
  audioBoostFactor,
  onSetAudioBoost,
  aspectRatio,
  onToggleAspectRatio,
  preferM3U8,
  embedUrl,
  onSwitchToEmbed,
}: PlayerSettingsMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      ref={settingsRef}
      className="absolute bottom-11 sm:bottom-12 right-0 z-50 w-56 sm:w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-white/15 bg-[#181818]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Settings Main Tab */}
      {activeTab === "main" && (
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
            Cài đặt phát video
          </div>

          {/* Speed item */}
          <button
            type="button"
            onClick={() => setActiveTab("speed")}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Gauge className="size-4 text-white/70" />
              <span>Tốc độ phát</span>
            </span>
            <span className="flex items-center gap-1 text-white/60">
              <span>{playbackSpeed}x</span>
              <ChevronRight className="size-3.5" />
            </span>
          </button>

          {/* Quality item */}
          {preferM3U8 && (
            <button
              type="button"
              onClick={() => setActiveTab("quality")}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-2">
                <SlidersIcon className="size-4 text-white/70" />
                <span>Chất lượng</span>
              </span>
              <span className="flex items-center gap-1 text-white/60">
                <span>
                  {currentQualityIndex === -1
                    ? "Auto"
                    : qualities.find((q) => q.index === currentQualityIndex)?.label}
                </span>
                <ChevronRight className="size-3.5" />
              </span>
            </button>
          )}

          {/* Audio Boost item */}
          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="size-4 text-white/70" />
              <span>Khuếch đại âm thanh</span>
            </span>
            <span className="flex items-center gap-1 text-white/60">
              <span className={audioBoostFactor > 1 ? "text-primary font-bold" : ""}>
                {`${Math.round(audioBoostFactor * 100)}%`}
              </span>
              <ChevronRight className="size-3.5" />
            </span>
          </button>

          {/* Ratio item */}
          <button
            type="button"
            onClick={onToggleAspectRatio}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Scaling className="size-4 text-white/70" />
              <span>Tỷ lệ khung hình</span>
            </span>
            <span className="text-white/60">
              {aspectRatio === "cover" ? "Phóng to (Cover)" : "Mặc định (16:9)"}
            </span>
          </button>

          {/* Switch to Embed Fallback if available */}
          {embedUrl && onSwitchToEmbed && (
            <button
              type="button"
              onClick={onSwitchToEmbed}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors text-white"
            >
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <span>Đổi sang Player dự phòng</span>
              </span>
              <span className="text-[11px] text-white/50">Embed</span>
            </button>
          )}
        </div>
      )}

      {/* Settings Speed Subtab */}
      {activeTab === "speed" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white border-b border-white/10 mb-1"
          >
            <ChevronRight className="size-3.5 rotate-180" />
            <span>Tốc độ phát</span>
          </button>
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSetSpeed(s)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                playbackSpeed === s ? "bg-primary text-white" : "hover:bg-white/10 text-white/80",
              )}
            >
              <span>{s === 1.0 ? "1.0x (Chuẩn)" : `${s}x`}</span>
              {playbackSpeed === s && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      )}

      {/* Settings Quality Subtab */}
      {activeTab === "quality" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white border-b border-white/10 mb-1"
          >
            <ChevronRight className="size-3.5 rotate-180" />
            <span>Chất lượng video</span>
          </button>
          {qualities.map((q) => (
            <button
              key={q.index}
              type="button"
              onClick={() => onSetQuality(q.index)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                currentQualityIndex === q.index ? "bg-primary text-white" : "hover:bg-white/10 text-white/80",
              )}
            >
              <span>{q.label}</span>
              {currentQualityIndex === q.index && <Check className="size-3.5" />}
            </button>
          ))}
          {qualities.length === 1 && (
            <p className="px-3 py-2 text-[11px] leading-4 text-white/55">
              Player không phát hiện thêm độ phân giải từ nguồn này.
            </p>
          )}
        </div>
      )}

      {/* Settings Audio Boost Subtab */}
      {activeTab === "audio" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab("main")}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white border-b border-white/10 mb-1 transition-colors"
          >
            <ChevronRight className="size-3.5 rotate-180" />
            <span>Khuếch đại âm thanh</span>
          </button>
          <p className="px-3 pb-1.5 pt-0.5 text-[11px] leading-relaxed text-white/50">
            Tăng âm lượng nguồn phát và tự động chống rè tiếng.
          </p>
          {AUDIO_BOOST_LEVELS.map(({ val, label, badge }) => {
            const isSelected = audioBoostFactor === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onSetAudioBoost(val)}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  isSelected ? "bg-primary text-white" : "hover:bg-white/10 text-white/80",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-10 text-left font-bold tabular-nums">{label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                      isSelected ? "bg-white/20 text-white" : "bg-white/10 text-white/60",
                    )}
                  >
                    {badge}
                  </span>
                </div>
                {isSelected && <Check className="size-3.5 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
