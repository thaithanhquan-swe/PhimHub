import {
  Lock,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipForward,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./constants";
import { PlayerSettingsMenu } from "./PlayerSettingsMenu";
import { TimelineScrubber } from "./TimelineScrubber";
import type { QualityOption, SettingsTab } from "./types";
import { VolumeControl } from "./VolumeControl";

interface PlayerBottomControlsProps {
  showControls: boolean;
  isPlaying: boolean;
  isScreenLocked: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  hoverTime: number | null;
  hoverPosition: number;
  volume: number;
  isMuted: boolean;
  canAdjustVolume: boolean;
  isVolumeSliderOpen: boolean;
  isTouchDevice: boolean;
  hasNextEpisode: boolean;
  isSettingsOpen: boolean;
  activeSettingsTab: SettingsTab;
  playbackSpeed: number;
  qualities: QualityOption[];
  currentQualityIndex: number;
  audioBoostFactor: number;
  aspectRatio: "contain" | "cover";
  preferM3U8: boolean;
  embedUrl?: string;
  isLandscape: boolean;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  onTogglePlay: () => void;
  onSeekBy: (delta: number) => void;
  onVolumeButtonClick: () => void;
  onVolumeChange: (vol: number, showToast?: boolean) => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  onSetActiveTab: (tab: SettingsTab) => void;
  onSetSpeed: (speed: number) => void;
  onSetQuality: (index: number) => void;
  onSetAudioBoost: (factor: number) => void;
  onToggleAspectRatio: () => void;
  onSwitchToEmbed?: () => void;
  onTogglePiP: () => void;
  onLockScreen: () => void;
  onToggleOrientation: () => void;
  onNextEpisode?: () => void;
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineTouch: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTimelineHover: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineMouseLeave: () => void;
}

export function PlayerBottomControls({
  showControls,
  isPlaying,
  isScreenLocked,
  currentTime,
  duration,
  bufferedEnd,
  hoverTime,
  hoverPosition,
  volume,
  isMuted,
  canAdjustVolume,
  isVolumeSliderOpen,
  isTouchDevice,
  hasNextEpisode,
  isSettingsOpen,
  activeSettingsTab,
  playbackSpeed,
  qualities,
  currentQualityIndex,
  audioBoostFactor,
  aspectRatio,
  preferM3U8,
  embedUrl,
  isLandscape,
  settingsRef,
  onTogglePlay,
  onSeekBy,
  onVolumeButtonClick,
  onVolumeChange,
  onToggleMute,
  onToggleSettings,
  onSetActiveTab,
  onSetSpeed,
  onSetQuality,
  onSetAudioBoost,
  onToggleAspectRatio,
  onSwitchToEmbed,
  onTogglePiP,
  onLockScreen,
  onToggleOrientation,
  onNextEpisode,
  onTimelineClick,
  onTimelineTouch,
  onTimelineHover,
  onTimelineMouseLeave,
}: PlayerBottomControlsProps) {
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 sm:px-5 pb-3 sm:pb-4 pt-12 transition-opacity duration-300",
        !isScreenLocked && (showControls || !isPlaying)
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Interactive Scrub Timeline Bar */}
      <TimelineScrubber
        progressPercent={progressPercent}
        bufferPercent={bufferPercent}
        hoverTime={hoverTime}
        hoverPosition={hoverPosition}
        onScrubClick={onTimelineClick}
        onScrubTouch={onTimelineTouch}
        onMouseMove={onTimelineHover}
        onMouseLeave={onTimelineMouseLeave}
      />

      {/* Buttons Row */}
      <div className="flex items-center justify-between text-white">
        {/* Left Controls: Play, 10s back, 10s forward, Volume, Time */}
        <div className="flex items-center gap-0.5 sm:gap-2">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors"
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause className="size-4 sm:size-5 fill-current" />
            ) : (
              <Play className="size-4 sm:size-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Rewind 10s */}
          <button
            type="button"
            onClick={() => onSeekBy(-10)}
            className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
            title="Lùi 10 giây (←)"
          >
            <RotateCcw className="size-3.5 sm:size-4" />
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            onClick={() => onSeekBy(10)}
            className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
            title="Tua tới 10 giây (→)"
          >
            <RotateCw className="size-3.5 sm:size-4" />
          </button>

          {/* Volume Control */}
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            canAdjustVolume={canAdjustVolume}
            isVolumeSliderOpen={isVolumeSliderOpen}
            isTouchDevice={isTouchDevice}
            onVolumeButtonClick={onVolumeButtonClick}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          {/* Time Indicator */}
          <div className="ml-1 sm:ml-2 flex items-center font-mono text-[10px] sm:text-xs tabular-nums select-none tracking-tight max-[360px]:hidden">
            <span className="font-semibold text-white/95">{formatTime(currentTime)}</span>
            <span className="mx-0.5 sm:mx-1 text-white/35">/</span>
            <span className="text-white/55">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Controls: Next Episode, Settings, PiP, Lock, Fullscreen */}
        <div className="flex items-center gap-0.5 sm:gap-2">
          {/* Next Episode Button */}
          {hasNextEpisode && onNextEpisode && (
            <button
              type="button"
              onClick={onNextEpisode}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
              title="Tập tiếp theo (N)"
            >
              <span className="hidden sm:inline">Tập tiếp</span>
              <SkipForward className="size-3.5 fill-current" />
            </button>
          )}

          {/* Settings Button + Popover */}
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={onToggleSettings}
              className={cn(
                "grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 transition-colors",
                isSettingsOpen && "bg-white/20 text-primary",
              )}
              title="Cài đặt phát video"
            >
              <Settings className="size-4" />
            </button>

            <PlayerSettingsMenu
              isOpen={isSettingsOpen}
              settingsRef={settingsRef}
              activeTab={activeSettingsTab}
              setActiveTab={onSetActiveTab}
              playbackSpeed={playbackSpeed}
              onSetSpeed={onSetSpeed}
              qualities={qualities}
              currentQualityIndex={currentQualityIndex}
              onSetQuality={onSetQuality}
              audioBoostFactor={audioBoostFactor}
              onSetAudioBoost={onSetAudioBoost}
              aspectRatio={aspectRatio}
              onToggleAspectRatio={onToggleAspectRatio}
              preferM3U8={preferM3U8}
              embedUrl={embedUrl}
              onSwitchToEmbed={onSwitchToEmbed}
            />
          </div>

          {/* Picture-in-Picture */}
          <button
            type="button"
            onClick={onTogglePiP}
            className="hidden sm:grid size-9 place-items-center rounded-full hover:bg-white/15 transition-colors text-white/90 hover:text-white"
            title="Hình trong hình (PiP)"
          >
            <PictureInPicture2 className="size-4" />
          </button>

          {/* Screen Lock Button */}
          <button
            type="button"
            onClick={onLockScreen}
            className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all text-white/90 hover:text-white"
            title="Khóa màn hình"
            aria-label="Khóa màn hình"
          >
            <Lock className="size-4 text-primary" />
          </button>

          {/* Orientation Toggle Button */}
          <button
            type="button"
            onClick={onToggleOrientation}
            className="grid size-7 min-[400px]:size-8 sm:size-9 place-items-center rounded-full hover:bg-white/15 active:scale-90 transition-all text-white/90 hover:text-white"
            title={isLandscape ? "Chế độ dọc (F)" : "Xoay ngang màn hình (F)"}
            aria-label={isLandscape ? "Chế độ dọc" : "Xoay ngang màn hình"}
          >
            {isLandscape ? <Minimize className="size-4 sm:size-5" /> : <Maximize className="size-4 sm:size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
