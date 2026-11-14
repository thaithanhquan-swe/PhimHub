import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioBoost(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [audioBoostFactor, setAudioBoostFactor] = useState(() => {
    try {
      const saved = localStorage.getItem("phimhub_audio_boost");
      if (saved) {
        const num = Number(saved);
        if (Number.isFinite(num) && num >= 1 && num <= 5.0) {
          return num;
        }
      }
    } catch {
      // Ignore
    }
    return 3.0; // Default 300% (+9.5 dB)
  });

  const audioBoostFactorRef = useRef(audioBoostFactor);
  audioBoostFactorRef.current = audioBoostFactor;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const initAudioGain = useCallback(
    (targetLevel?: number) => {
      const video = videoRef.current;
      if (!video) return null;

      const level = typeof targetLevel === "number" ? targetLevel : audioBoostFactorRef.current;

      // Reuse existing graph if already established on this video element
      if (gainNodeRef.current && audioCtxRef.current) {
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        gainNodeRef.current.gain.value = level;
        return gainNodeRef.current;
      }

      try {
        if (typeof window === "undefined") return null;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;

        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();

        // Prevent clipping & distortion when boosting up to 500%
        compressor.threshold.value = -8;
        compressor.knee.value = 25;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        gain.gain.value = level;

        source.connect(gain);
        gain.connect(compressor);
        compressor.connect(ctx.destination);

        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;
        sourceNodeRef.current = source;

        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        return gain;
      } catch (err) {
        console.warn("AudioContext boost initialization:", err);
        return null;
      }
    },
    [videoRef],
  );

  const setBoostLevel = useCallback(
    (level: number, onToast?: (msg: string) => void) => {
      setAudioBoostFactor(level);
      audioBoostFactorRef.current = level;
      const gainNode = initAudioGain(level);
      if (gainNode) {
        gainNode.gain.value = level;
      }
      try {
        localStorage.setItem("phimhub_audio_boost", String(level));
      } catch {
        // Ignore
      }
      onToast?.(
        level > 1
          ? `Đã bật tăng âm: ${Math.round(level * 100)}%`
          : "Âm thanh: Tiêu chuẩn (100%)",
      );
    },
    [initAudioGain],
  );

  const resumeAudioContext = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  // Automatically activate saved audio boost factor on initial load / refresh (F5)
  // as soon as video plays or user performs any gesture
  useEffect(() => {
    if (audioBoostFactor <= 1) return;

    let activated = false;
    const activate = () => {
      if (activated && audioCtxRef.current?.state === "running") return;
      const gain = initAudioGain();
      if (gain) {
        activated = true;
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current
          .resume()
          .then(() => {
            activated = true;
          })
          .catch(() => {});
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("play", activate);
      video.addEventListener("playing", activate);
      if (!video.paused && !video.muted) {
        activate();
      }
    }

    // Browsers require a user gesture to resume AudioContext.
    // Listen to the first interaction event anywhere on the window.
    const gestureEvents = ["pointerdown", "keydown", "touchstart", "click"] as const;
    const onGesture = () => {
      activate();
    };

    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, onGesture, { capture: true, passive: true });
    });

    return () => {
      if (video) {
        video.removeEventListener("play", activate);
        video.removeEventListener("playing", activate);
      }
      gestureEvents.forEach((evt) => {
        window.removeEventListener(evt, onGesture, { capture: true } as EventListenerOptions);
      });
    };
  }, [audioBoostFactor, initAudioGain, videoRef]);

  // Clean up Web Audio resources on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    audioBoostFactor,
    initAudioGain,
    setBoostLevel,
    resumeAudioContext,
  };
}
