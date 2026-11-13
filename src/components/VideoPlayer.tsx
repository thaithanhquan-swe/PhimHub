import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useAssistiveTouchLock } from "@/hooks/useAssistiveTouchLock";
import { useAudioBoost } from "@/hooks/useAudioBoost";
import { useHlsPlayer } from "@/hooks/useHlsPlayer";
import { usePlayerGestures } from "@/hooks/usePlayerGestures";
import { usePlayerOrientation } from "@/hooks/usePlayerOrientation";
import { cn } from "@/lib/utils";
import {
  AssistiveTouchLock,
  DoubleTapFeedback,
  EmbedPlayerFallback,
  NextEpisodePrompt,
  PlayerBottomControls,
  PlayerCenterControls,
  type SettingsTab,
  type VideoPlayerProps,
} from "./player";

export function VideoPlayer({
  m3u8Url,
  embedUrl,
  title,
  episodeName: _episodeName,
  poster,
  autoPlay = true,
  hasNextEpisode = false,
  onNextEpisode,
  onTimeUpdate,
  initialTime = 0,
  preferEmbed = false,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Volume & Audio boost
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("phimhub_player_volume");
      if (saved) {
        const num = Number(saved);
        if (Number.isFinite(num) && num >= 0 && num <= 1) return num;
      }
    } catch {
      // Ignore
    }
    return 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [canAdjustVolume, setCanAdjustVolume] = useState(true);
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<"contain" | "cover">("contain");
  const [isTouchDevice] = useState(
    () => navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches,
  );

  // UI state
  const [useEmbedFallback, setUseEmbedFallback] = useState(preferEmbed);
  const [showControls, setShowControls] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("main");

  // Timeline hover
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const preferM3U8 = Boolean(m3u8Url && !useEmbedFallback);

  useEffect(() => {
    setUseEmbedFallback(preferEmbed);
  }, [preferEmbed]);

  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2800);
  }, []);

  // Audio Amplification (Web Audio API hook)
  const { audioBoostFactor, initAudioGain, setBoostLevel, resumeAudioContext } = useAudioBoost(videoRef);

  // Orientation and Fullscreen
  const {
    isFullscreen,
    isDeviceLandscape,
    isManualFullscreen,
    isLandscapeView,
    isLandscape,
    handleToggleScreenOrientation,
  } = usePlayerOrientation({
    containerRef,
    videoRef,
    triggerToast,
    onResetHideControlsTimer: resetHideControlsTimer,
  });

  // Screen lock & floating AssistiveTouch virtual button
  const {
    isScreenLocked,
    showUnlockButton,
    setShowUnlockButton,
    lockButtonPos,
    isDraggingLock,
    handleLockScreen,
    handleUnlockScreen,
    handleLockPointerDown,
    handleLockPointerMove,
    handleLockPointerUp,
    resetUnlockButtonTimer,
  } = useAssistiveTouchLock({
    containerRef,
    onLockScreen: () => {
      setShowControls(false);
      setIsSettingsOpen(false);
      setIsVolumeSliderOpen(false);
    },
    onUnlockScreen: () => {
      setShowControls(true);
      resetHideControlsTimer();
    },
    triggerToast,
  });

  // HLS stream playback
  const {
    isPlaying,
    currentTime,
    setCurrentTime,
    duration,
    bufferedEnd,
    isLoading,
    setIsLoading,
    error,
    qualities,
    currentQualityIndex,
    setQuality,
    autoNextCountdown,
    mutedAutoplayNotice,
    setMutedAutoplayNotice,
    retryPlayback,
  } = useHlsPlayer({
    videoRef,
    m3u8Url,
    embedUrl,
    preferM3U8,
    autoPlay,
    initialTime,
    hasNextEpisode,
    onNextEpisode,
    onTimeUpdate,
    onFallbackToEmbed: () => setUseEmbedFallback(true),
    onSetMuted: setIsMuted,
  });

  // Playback control actions
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    resumeAudioContext();
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideControlsTimer();
  }

  function seekBy(deltaSeconds: number, skipCenterFeedback = false) {
    const video = videoRef.current;
    if (!video) return;
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    const maxTime = dur > 0 ? dur : Math.max(video.currentTime + deltaSeconds, 0);
    const target = Math.max(0, Math.min(maxTime, video.currentTime + deltaSeconds));
    video.currentTime = target;
    setCurrentTime(target);
    if (!skipCenterFeedback) {
      triggerToast(deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`);
    }
    resetHideControlsTimer();
  }

  function changeVolume(newVol: number) {
    const video = videoRef.current;
    if (!video) return;

    const clampedVol = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
    try {
      video.volume = clampedVol;
    } catch {
      // Ignore read-only volume on iOS Safari
    }

    const gainNode = initAudioGain();
    if (gainNode) {
      resumeAudioContext();
      gainNode.gain.value = audioBoostFactor;
    }

    const appliedVolume = video.volume;
    const volumeWasApplied = Math.abs(appliedVolume - clampedVol) < 0.02 || Boolean(gainNode);
    setCanAdjustVolume(volumeWasApplied);
    setVolume(clampedVol);

    if (clampedVol > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    try {
      localStorage.setItem("phimhub_player_volume", String(clampedVol));
    } catch {
      // Ignore
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;

    resumeAudioContext();
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      if (volume === 0) changeVolume(0.5);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }

  function setSpeed(speed: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setIsSettingsOpen(false);
  }

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP error:", err);
    }
  };

  // Double tap seek gestures & single tap toggle
  const { doubleTapFeedback, handleClick, handleTouchStart, handleTouchEnd } = usePlayerGestures({
    containerRef,
    isScreenLocked,
    onSeekBy: seekBy,
    onSingleTap: () => {
      if (!showControls) {
        setShowControls(true);
        resetHideControlsTimer();
        return;
      }
      togglePlay();
    },
    onWakeLockIndicator: () => {
      setShowUnlockButton(true);
      resetUnlockButtonTimer();
    },
  });

  // Close settings menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSettingsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

  // Keyboard Shortcuts (Netflix Standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScreenLocked) return;
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          handleToggleScreenOrientation();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekBy(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekBy(10);
          break;
        case "arrowup":
          e.preventDefault();
          changeVolume(Math.min(1, Math.round((volume + 0.05) * 100) / 100));
          break;
        case "arrowdown":
          e.preventDefault();
          changeVolume(Math.max(0, Math.round((volume - 0.05) * 100) / 100));
          break;
        case "n":
          if (hasNextEpisode && onNextEpisode) {
            e.preventDefault();
            onNextEpisode();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, hasNextEpisode, onNextEpisode, isScreenLocked, handleToggleScreenOrientation]);

  // Timeline scrub handlers
  function handleTimelineScrub(e: React.MouseEvent<HTMLDivElement>) {
    if (isScreenLocked) return;
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
    setCurrentTime(pos * duration);
    resetHideControlsTimer();
  }

  const handleTimelineScrubTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isScreenLocked) return;
    const video = videoRef.current;
    if (!video || !duration || duration <= 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
    setCurrentTime(pos * duration);
    resetHideControlsTimer();
  };

  function handleTimelineHover(e: React.MouseEvent<HTMLDivElement>) {
    if (isScreenLocked) return;
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverPosition(pos * 100);
  }

  // If using embed iframe (fallback or when preferEmbed is set)
  if (!preferM3U8 && embedUrl) {
    return (
      <EmbedPlayerFallback
        containerRef={containerRef}
        embedUrl={embedUrl}
        title={title}
        m3u8Url={m3u8Url}
        isDeviceLandscape={isDeviceLandscape}
        isManualFullscreen={isManualFullscreen}
        isFullscreen={isFullscreen}
        isLandscapeView={isLandscapeView}
        onSwitchToHls={() => setUseEmbedFallback(false)}
        onToggleOrientation={handleToggleScreenOrientation}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideControlsTimer}
      onTouchStart={() => {
        if (isScreenLocked) {
          setShowUnlockButton(true);
          resetUnlockButtonTimer();
        }
      }}
      onMouseLeave={() => {
        if (isPlaying && !isSettingsOpen) setShowControls(false);
      }}
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-md bg-black shadow-2xl ring-1 ring-white/10 select-none",
        !showControls && isPlaying && "cursor-none",
        (isDeviceLandscape || isManualFullscreen || isFullscreen) && "player-landscape-mode",
      )}
    >
      {/* Native HTML5 Video Player */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        crossOrigin="anonymous"
        poster={poster}
        className={cn(
          "size-full bg-black transition-all pointer-events-none",
          aspectRatio === "cover" ? "object-cover" : "object-contain",
        )}
        preload="auto"
      />

      {/* Gesture Tap / Double Tap Surface */}
      <div
        data-testid="video-gesture-surface"
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Khu vực cử chỉ phát video"
      />

      {/* Animated Double-Tap Seek Indicators (+10s / -10s) */}
      <DoubleTapFeedback feedback={doubleTapFeedback} />

      {/* Floating AssistiveTouch Virtual Lock Button */}
      <AssistiveTouchLock
        isScreenLocked={isScreenLocked}
        showUnlockButton={showUnlockButton}
        lockButtonPos={lockButtonPos}
        isDraggingLock={isDraggingLock}
        onPointerDown={handleLockPointerDown}
        onPointerMove={handleLockPointerMove}
        onPointerUp={handleLockPointerUp}
        onUnlock={handleUnlockScreen}
      />

      {/* Center Controls, Play Button, Buffering Spinner, Toasts & Alerts */}
      <PlayerCenterControls
        isLoading={isLoading}
        isPlaying={isPlaying}
        isMuted={isMuted}
        isScreenLocked={isScreenLocked}
        error={error}
        toastMessage={toastMessage}
        mutedAutoplayNotice={mutedAutoplayNotice}
        embedUrl={embedUrl}
        onTogglePlay={togglePlay}
        onToggleMute={toggleMute}
        onDismissMutedAutoplay={() => setMutedAutoplayNotice(false)}
        onRetry={retryPlayback}
        onUseFallback={() => {
          setUseEmbedFallback(true);
          setIsLoading(false);
        }}
      />

      {/* Netflix-style Player Bottom Bar with Scrubber & Settings */}
      <PlayerBottomControls
        showControls={showControls}
        isScreenLocked={isScreenLocked}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedEnd={bufferedEnd}
        hoverTime={hoverTime}
        hoverPosition={hoverPosition}
        volume={volume}
        isMuted={isMuted}
        canAdjustVolume={canAdjustVolume}
        isVolumeSliderOpen={isVolumeSliderOpen}
        isTouchDevice={isTouchDevice}
        hasNextEpisode={hasNextEpisode}
        isSettingsOpen={isSettingsOpen}
        activeSettingsTab={activeSettingsTab}
        playbackSpeed={playbackSpeed}
        qualities={qualities}
        currentQualityIndex={currentQualityIndex}
        audioBoostFactor={audioBoostFactor}
        aspectRatio={aspectRatio}
        preferM3U8={preferM3U8}
        embedUrl={embedUrl}
        isLandscape={isLandscape}
        settingsRef={settingsRef}
        onTogglePlay={togglePlay}
        onSeekBy={seekBy}
        onVolumeButtonClick={() => {
          if (isTouchDevice) {
            setIsVolumeSliderOpen((prev) => !prev);
          } else {
            toggleMute();
          }
        }}
        onVolumeChange={changeVolume}
        onToggleMute={toggleMute}
        onToggleSettings={() => {
          setIsSettingsOpen((prev) => !prev);
          setActiveSettingsTab("main");
        }}
        onSetActiveTab={setActiveSettingsTab}
        onSetSpeed={setSpeed}
        onSetQuality={setQuality}
        onSetAudioBoost={(val) => setBoostLevel(val, triggerToast)}
        onToggleAspectRatio={() => {
          setAspectRatio((prev) => (prev === "contain" ? "cover" : "contain"));
          setIsSettingsOpen(false);
        }}
        onSwitchToEmbed={() => {
          setUseEmbedFallback(true);
          setIsSettingsOpen(false);
        }}
        onTogglePiP={togglePiP}
        onLockScreen={handleLockScreen}
        onToggleOrientation={handleToggleScreenOrientation}
        onNextEpisode={onNextEpisode}
        onTimelineClick={handleTimelineScrub}
        onTimelineTouch={handleTimelineScrubTouch}
        onTimelineHover={handleTimelineHover}
        onTimelineMouseLeave={() => setHoverTime(null)}
      />

      {/* Netflix-style "Next Episode" Prompt in last 25s */}
      <NextEpisodePrompt
        countdown={autoNextCountdown}
        hasNextEpisode={hasNextEpisode}
        isScreenLocked={isScreenLocked}
        onNextEpisode={onNextEpisode}
      />
    </div>
  );
}
