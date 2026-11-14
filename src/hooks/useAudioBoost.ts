import { useCallback, useEffect, useRef, useState } from "react";

// Module-level singleton Web Audio graph to preserve audio context and boost factor across episodes and player unmounts
let globalAudioCtx: AudioContext | null = null;
let globalGainNode: GainNode | null = null;
let globalCompressor: DynamicsCompressorNode | null = null;
const mediaSourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let activeSourceNode: MediaElementAudioSourceNode | null = null;
let activeSourceElement: HTMLMediaElement | null = null;

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function getOrCreateAudioGraph(targetLevel: number) {
  const AudioCtx = getAudioContextClass();
  if (!AudioCtx) return null;

  try {
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      if (
        globalAudioCtx &&
        globalAudioCtx.state !== "closed" &&
        typeof globalAudioCtx.close === "function"
      ) {
        try {
          globalAudioCtx.close().catch(() => {});
        } catch {
          // Ignore
        }
      }
      try {
        globalAudioCtx = new AudioCtx({ latencyHint: "interactive" });
      } catch {
        globalAudioCtx = new AudioCtx();
      }
      globalGainNode = globalAudioCtx.createGain();
      globalCompressor = globalAudioCtx.createDynamicsCompressor();

      // Prevent clipping & distortion when boosting up to 500%
      globalCompressor.threshold.value = -8;
      globalCompressor.knee.value = 25;
      globalCompressor.ratio.value = 12;
      globalCompressor.attack.value = 0.003;
      globalCompressor.release.value = 0.25;

      globalGainNode.connect(globalCompressor);
      globalCompressor.connect(globalAudioCtx.destination);
      activeSourceNode = null;
      activeSourceElement = null;
    }

    if (globalGainNode) {
      globalGainNode.gain.value = targetLevel;
    }

    if (globalAudioCtx.state === "suspended" && typeof globalAudioCtx.resume === "function") {
      globalAudioCtx.resume().catch(() => {});
    }

    return {
      ctx: globalAudioCtx,
      gain: globalGainNode,
      compressor: globalCompressor,
    };
  } catch (err) {
    console.warn("AudioContext boost initialization:", err);
    return null;
  }
}

function attachVideoToGraph(video: HTMLVideoElement, targetLevel: number): GainNode | null {
  const graph = getOrCreateAudioGraph(targetLevel);
  if (!graph || !graph.ctx || !graph.gain) return null;

  try {
    let source = mediaSourceNodeMap.get(video);
    if (!source) {
      source = graph.ctx.createMediaElementSource(video);
      mediaSourceNodeMap.set(video, source);
    }

    // Connect this source node to shared gain if not already connected
    if (activeSourceNode !== source || activeSourceElement !== video) {
      if (activeSourceNode) {
        try {
          activeSourceNode.disconnect();
        } catch {
          // Ignore
        }
      }
      source.connect(graph.gain);
      activeSourceNode = source;
      activeSourceElement = video;
    }

    graph.gain.gain.value = targetLevel;

    if (graph.ctx.state === "suspended" && typeof graph.ctx.resume === "function") {
      graph.ctx.resume().catch(() => {});
    }

    return graph.gain;
  } catch (err) {
    console.warn("AudioContext boost initialization:", err);
    return null;
  }
}

// Reset singleton state for unit testing
export function _resetAudioGraphForTesting() {
  if (
    globalAudioCtx &&
    globalAudioCtx.state !== "closed" &&
    typeof globalAudioCtx.close === "function"
  ) {
    try {
      globalAudioCtx.close().catch(() => {});
    } catch {
      // Ignore
    }
  }
  globalAudioCtx = null;
  globalGainNode = null;
  globalCompressor = null;
  activeSourceNode = null;
  activeSourceElement = null;
}

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

  const initAudioGain = useCallback(
    (targetLevel?: number) => {
      const video = videoRef.current;
      if (!video) return null;

      const level = typeof targetLevel === "number" ? targetLevel : audioBoostFactorRef.current;
      return attachVideoToGraph(video, level);
    },
    [videoRef],
  );

  const resumeAudioContext = useCallback(() => {
    if (
      globalAudioCtx &&
      globalAudioCtx.state === "suspended" &&
      typeof globalAudioCtx.resume === "function"
    ) {
      globalAudioCtx.resume().catch(() => {});
    }
  }, []);

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

  // Automatically activate and sync saved audio boost factor on initial load, refresh (F5),
  // episode switch, and as soon as video plays or user performs any gesture
  useEffect(() => {
    if (audioBoostFactor <= 1) return;

    const activate = () => {
      const gain = initAudioGain();
      if (gain) {
        gain.gain.value = audioBoostFactorRef.current;
      }
      resumeAudioContext();
    };

    const onPause = () => {
      if (globalGainNode && globalAudioCtx && globalAudioCtx.state === "running") {
        try {
          if (typeof globalGainNode.gain.cancelScheduledValues === "function") {
            globalGainNode.gain.cancelScheduledValues(globalAudioCtx.currentTime);
          }
          if (typeof globalGainNode.gain.setValueAtTime === "function") {
            globalGainNode.gain.setValueAtTime(0, globalAudioCtx.currentTime);
          } else {
            globalGainNode.gain.value = 0;
          }
        } catch {
          // Ignore
        }
      }
    };

    const onPlay = () => {
      if (globalGainNode && globalAudioCtx && globalAudioCtx.state === "running") {
        try {
          if (typeof globalGainNode.gain.cancelScheduledValues === "function") {
            globalGainNode.gain.cancelScheduledValues(globalAudioCtx.currentTime);
          }
          if (typeof globalGainNode.gain.setValueAtTime === "function") {
            globalGainNode.gain.setValueAtTime(audioBoostFactorRef.current, globalAudioCtx.currentTime);
          } else {
            globalGainNode.gain.value = audioBoostFactorRef.current;
          }
        } catch {
          // Ignore
        }
      }
      activate();
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);
      video.addEventListener("playing", onPlay);
      video.addEventListener("loadeddata", activate);
      video.addEventListener("canplay", activate);
      activate();
    }

    // Browsers require a user gesture to resume AudioContext.
    // Listen to the interaction events anywhere on the window.
    const gestureEvents = ["pointerdown", "keydown", "touchstart", "click"] as const;
    const onGesture = () => {
      activate();
    };

    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, onGesture, { capture: true, passive: true });
    });

    return () => {
      if (video) {
        video.removeEventListener("pause", onPause);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("playing", onPlay);
        video.removeEventListener("loadeddata", activate);
        video.removeEventListener("canplay", activate);
      }
      gestureEvents.forEach((evt) => {
        window.removeEventListener(evt, onGesture, { capture: true } as EventListenerOptions);
      });
    };
  }, [audioBoostFactor, initAudioGain, resumeAudioContext, videoRef]);

  // When unmounting, disconnect source node from graph if needed, but preserve global AudioContext
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && activeSourceElement === video && activeSourceNode) {
        try {
          activeSourceNode.disconnect();
        } catch {
          // Ignore
        }
        activeSourceNode = null;
        activeSourceElement = null;
      }
    };
  }, [videoRef]);

  return {
    audioBoostFactor,
    initAudioGain,
    setBoostLevel,
    resumeAudioContext,
  };
}
