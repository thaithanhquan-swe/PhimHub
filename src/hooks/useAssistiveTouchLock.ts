import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

interface UseAssistiveTouchLockOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLockScreen?: () => void;
  onUnlockScreen?: () => void;
  triggerToast: (msg: string) => void;
}

export function useAssistiveTouchLock({
  containerRef,
  onLockScreen,
  onUnlockScreen,
  triggerToast,
}: UseAssistiveTouchLockOptions) {
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showUnlockButton, setShowUnlockButton] = useState(false);
  const [lockButtonPos, setLockButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLock, setIsDraggingLock] = useState(false);

  const isDraggingLockRef = useRef(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    hasMoved: false,
  });
  const lastUnlockTimeRef = useRef(0);
  const unlockButtonTimerRef = useRef<number | null>(null);

  const resetUnlockButtonTimer = useCallback(() => {
    if (unlockButtonTimerRef.current) {
      window.clearTimeout(unlockButtonTimerRef.current);
    }
    unlockButtonTimerRef.current = window.setTimeout(() => {
      if (!isDraggingLockRef.current) {
        setShowUnlockButton(false);
      }
    }, 4500);
  }, []);

  const handleLockScreen = useCallback(() => {
    setIsScreenLocked(true);
    setShowUnlockButton(true);
    resetUnlockButtonTimer();
    triggerToast("Đã khóa màn hình");
    onLockScreen?.();

    if (!lockButtonPos) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const safePad = 14;
        const buttonSize = 54;
        const initialY = Math.max(safePad, (rect.height - buttonSize) / 2);
        setLockButtonPos({ x: safePad, y: initialY });
      }
    }
  }, [containerRef, lockButtonPos, onLockScreen, resetUnlockButtonTimer, triggerToast]);

  const handleUnlockScreen = useCallback(() => {
    if (Date.now() - lastUnlockTimeRef.current < 400) return;
    lastUnlockTimeRef.current = Date.now();
    setIsScreenLocked(false);
    setShowUnlockButton(false);
    triggerToast("Đã mở khóa màn hình");
    onUnlockScreen?.();
  }, [onUnlockScreen, triggerToast]);

  // Window resize & orientation clamp
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const buttonSize = 54;
      const safePad = 14;
      setLockButtonPos((prev) => {
        if (!prev) return null;
        const maxX = Math.max(safePad, rect.width - buttonSize - safePad);
        const maxY = Math.max(safePad, rect.height - buttonSize - safePad);
        const targetX = prev.x > rect.width / 2 ? maxX : safePad;
        const targetY = Math.max(safePad, Math.min(maxY, prev.y));
        return { x: targetX, y: targetY };
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [containerRef]);

  // AssistiveTouch drag handlers
  const handleLockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in environments without pointer capture
    }

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const buttonRect = e.currentTarget.getBoundingClientRect();

    const currentX = lockButtonPos ? lockButtonPos.x : buttonRect.left - containerRect.left;
    const currentY = lockButtonPos ? lockButtonPos.y : buttonRect.top - containerRect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: currentX,
      initialPosY: currentY,
      hasMoved: false,
    };
    isDraggingLockRef.current = true;
    setIsDraggingLock(true);
    setShowUnlockButton(true);
    resetUnlockButtonTimer();
  };

  const handleLockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLockRef.current) return;
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.hasMoved = true;
    }

    const buttonSize = 54;
    const safePad = 12;

    const minX = safePad;
    const maxX = Math.max(safePad, containerRect.width - buttonSize - safePad);
    const minY = safePad;
    const maxY = Math.max(safePad, containerRect.height - buttonSize - safePad);

    const rawX = dragStartRef.current.initialPosX + dx;
    const rawY = dragStartRef.current.initialPosY + dy;

    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    setLockButtonPos({ x: clampedX, y: clampedY });
    resetUnlockButtonTimer();
  };

  const handleLockPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingLockRef.current) return;
    e.stopPropagation();
    isDraggingLockRef.current = false;
    setIsDraggingLock(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const buttonSize = 54;
      const safePad = 14;

      const currentX = lockButtonPos ? lockButtonPos.x : dragStartRef.current.initialPosX;
      const currentY = lockButtonPos ? lockButtonPos.y : dragStartRef.current.initialPosY;

      const isNearRight = currentX > containerRect.width / 2;
      const snapX = isNearRight ? Math.max(safePad, containerRect.width - buttonSize - safePad) : safePad;
      const snapY = Math.max(safePad, Math.min(containerRect.height - buttonSize - safePad, currentY));

      setLockButtonPos({ x: snapX, y: snapY });
    }

    resetUnlockButtonTimer();

    // If the pointer didn't move significantly, treat this pointer interaction as a tap to unlock
    if (!dragStartRef.current.hasMoved) {
      handleUnlockScreen();
    }
    dragStartRef.current.hasMoved = false;
  };

  useEffect(() => {
    return () => {
      if (unlockButtonTimerRef.current) window.clearTimeout(unlockButtonTimerRef.current);
    };
  }, []);

  return {
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
  };
}
