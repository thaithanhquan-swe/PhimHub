import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type { DoubleTapFeedbackState } from "@/components/player/types";

interface UsePlayerGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isScreenLocked: boolean;
  onSeekBy: (deltaSeconds: number, skipCenterFeedback?: boolean) => void;
  onSingleTap: () => void;
  onWakeLockIndicator: () => void;
}

export function usePlayerGestures({
  containerRef,
  isScreenLocked,
  onSeekBy,
  onSingleTap,
  onWakeLockIndicator,
}: UsePlayerGesturesOptions) {
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<DoubleTapFeedbackState>(null);
  const singleTapTimerRef = useRef<number | null>(null);
  const doubleTapActiveRef = useRef<{
    side: "left" | "right";
    count: number;
    lastTime: number;
  } | null>(null);
  const doubleTapResetTimerRef = useRef<number | null>(null);
  const pendingTapRef = useRef<{
    side: "left" | "right";
    time: number;
  } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchTimestampRef = useRef<number>(0);

  const handleTap = useCallback(
    (clientX: number) => {
      if (isScreenLocked) {
        onWakeLockIndicator();
        return;
      }

      const container = containerRef.current;
      let side: "left" | "right" = "right";

      if (container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : typeof window !== "undefined" ? window.innerWidth : 800;
        const left = rect.width > 0 ? rect.left : 0;
        const relativeX = clientX - left;
        side = relativeX < width / 2 ? "left" : "right";
      }

      const now = Date.now();

      // 1. Continuation tap in active double-tap burst (e.g. +20s, +30s...)
      if (
        doubleTapActiveRef.current &&
        doubleTapActiveRef.current.side === side &&
        now - doubleTapActiveRef.current.lastTime < 650
      ) {
        if (doubleTapResetTimerRef.current) {
          window.clearTimeout(doubleTapResetTimerRef.current);
        }
        const newCount = doubleTapActiveRef.current.count + 1;
        doubleTapActiveRef.current = {
          side,
          count: newCount,
          lastTime: now,
        };

        onSeekBy(side === "right" ? 10 : -10, true);
        setDoubleTapFeedback({
          side,
          seconds: newCount * 10,
        });

        doubleTapResetTimerRef.current = window.setTimeout(() => {
          doubleTapActiveRef.current = null;
          setDoubleTapFeedback(null);
        }, 650);
        return;
      }

      // 2. Second tap of a new double tap
      if (
        pendingTapRef.current &&
        pendingTapRef.current.side === side &&
        now - pendingTapRef.current.time < 320
      ) {
        if (singleTapTimerRef.current) {
          window.clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        pendingTapRef.current = null;

        if (doubleTapResetTimerRef.current) {
          window.clearTimeout(doubleTapResetTimerRef.current);
        }
        doubleTapActiveRef.current = {
          side,
          count: 1,
          lastTime: now,
        };

        onSeekBy(side === "right" ? 10 : -10, true);
        setDoubleTapFeedback({
          side,
          seconds: 10,
        });

        doubleTapResetTimerRef.current = window.setTimeout(() => {
          doubleTapActiveRef.current = null;
          setDoubleTapFeedback(null);
        }, 650);
        return;
      }

      // 3. First tap (wait 280ms before triggering single tap)
      pendingTapRef.current = {
        side,
        time: now,
      };
      if (singleTapTimerRef.current) {
        window.clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = window.setTimeout(() => {
        pendingTapRef.current = null;
        singleTapTimerRef.current = null;
        onSingleTap();
      }, 280);
    },
    [containerRef, isScreenLocked, onSeekBy, onSingleTap, onWakeLockIndicator],
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isScreenLocked) {
      onWakeLockIndicator();
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    } else {
      touchStartPosRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isScreenLocked) return;
    if (!touchStartPosRef.current) return;

    const start = touchStartPosRef.current;
    touchStartPosRef.current = null;

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      const dt = Date.now() - start.time;

      if (dx < 15 && dy < 15 && dt < 400) {
        lastTouchTimestampRef.current = Date.now();
        handleTap(touch.clientX);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() - lastTouchTimestampRef.current < 500) {
      return;
    }
    handleTap(e.clientX);
  };

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
      if (doubleTapResetTimerRef.current) window.clearTimeout(doubleTapResetTimerRef.current);
    };
  }, []);

  return {
    doubleTapFeedback,
    handleClick,
    handleTouchStart,
    handleTouchEnd,
  };
}
