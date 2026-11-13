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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const initAudioGain = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;

    if (gainNodeRef.current && audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
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

      compressor.threshold.value = -8;
      compressor.knee.value = 25;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      gain.gain.value = audioBoostFactor;

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
  }, [audioBoostFactor, videoRef]);

  const setBoostLevel = useCallback(
    (level: number, onToast?: (msg: string) => void) => {
      setAudioBoostFactor(level);
      const gainNode = initAudioGain();
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
