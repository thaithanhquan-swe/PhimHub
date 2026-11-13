import { useCallback, useEffect, useState } from "react";
import type React from "react";

interface UsePlayerOrientationOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  triggerToast: (msg: string) => void;
  onResetHideControlsTimer: () => void;
}

export function usePlayerOrientation({
  containerRef,
  videoRef,
  triggerToast,
  onResetHideControlsTimer,
}: UsePlayerOrientationOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(false);
  const [isManualFullscreen, setIsManualFullscreen] = useState(false);
  const [isLandscapeView, setIsLandscapeView] = useState(false);

  // Mobile landscape detection
  useEffect(() => {
    const updateOrientation = () => {
      const isMobileLandscape =
        window.innerWidth > window.innerHeight &&
        (navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
      setIsDeviceLandscape(isMobileLandscape);
    };
    const handleOrientationChange = () => {
      updateOrientation();
      if (window.innerWidth <= window.innerHeight && !isLandscapeView) {
        setIsManualFullscreen(false);
      }
    };

    updateOrientation();
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", updateOrientation);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", updateOrientation);
    };
  }, [isLandscapeView]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement,
      );
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsLandscapeView(false);
        setIsManualFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Prevent iOS Safari QuickTime override
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleBeginFs = () => {
      if (typeof (video as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen === "function") {
        (video as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }
    };

    video.addEventListener("webkitbeginfullscreen", handleBeginFs);
    return () => video.removeEventListener("webkitbeginfullscreen", handleBeginFs);
  }, [videoRef]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isManualFullscreen || isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isManualFullscreen, isFullscreen]);

  // Screen orientation / fullscreen toggle
  const handleToggleScreenOrientation = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const orientation = screen.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: "landscape" | "portrait") => Promise<void>;
          unlock?: () => void;
        })
      | undefined;

    const isCurrentlyLandscape = Boolean(
      document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (video as unknown as { webkitDisplayingFullscreen?: boolean })?.webkitDisplayingFullscreen ||
        isFullscreen ||
        isManualFullscreen ||
        isLandscapeView,
    );

    // Exit landscape/fullscreen
    if (isCurrentlyLandscape) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      } else if (
        video &&
        typeof (video as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen === "function"
      ) {
        (video as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      }

      if (orientation?.unlock) {
        try {
          orientation.unlock();
        } catch {
          // Ignore
        }
      }

      if (orientation?.lock) {
        try {
          orientation.lock("portrait").catch(() => {});
        } catch {
          // Ignore
        }
      }

      setIsManualFullscreen(false);
      setIsFullscreen(false);
      setIsLandscapeView(false);
      triggerToast("Chế độ dọc");
      onResetHideControlsTimer();
      return;
    }

    // Enter landscape/fullscreen
    setIsLandscapeView(true);
    triggerToast("Xoay ngang màn hình");

    if (container.requestFullscreen) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn("requestFullscreen error:", err);
      }
    } else if ((container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
      try {
        await (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn("webkitRequestFullscreen error:", err);
      }
    }

    if (orientation?.lock) {
      try {
        await orientation.lock("landscape");
      } catch (err) {
        console.warn("orientation.lock error:", err);
      }
    }

    setIsManualFullscreen(true);
    onResetHideControlsTimer();
  }, [containerRef, videoRef, isFullscreen, isLandscapeView, isManualFullscreen, onResetHideControlsTimer, triggerToast]);

  const isLandscape = isDeviceLandscape || isManualFullscreen || isLandscapeView;

  return {
    isFullscreen,
    isDeviceLandscape,
    isManualFullscreen,
    isLandscapeView,
    isLandscape,
    handleToggleScreenOrientation,
  };
}
