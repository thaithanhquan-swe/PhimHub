import { FastForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface NetflixIntroProps {
  onComplete: () => void;
  autoPlayAudio?: boolean;
}

// Netflix signature spectrum colors for the exploding ribbons
const SPECTRUM_COLORS = [
  "#E50914", // Netflix signature red
  "#FF1E27", // Bright scarlet
  "#B81D24", // Deep crimson
  "#FF3366", // Vivid rose
  "#FF6B8B", // Coral pink
  "#8A2387", // Imperial violet
  "#E94057", // Ruby red
  "#F27121", // Amber blaze
  "#00D2FF", // Electric cyan
  "#3A7BD5", // Cinema blue
  "#9D50BB", // Amethyst
  "#6E48AA", // Deep purple
  "#FFB88C", // Warm glow
  "#E50914", // Dominant red
  "#FF0844", // Neon magenta
  "#FFB199", // Soft peach
  "#E50914", // Signature red
];

interface LightRibbon {
  x: number;
  targetX: number;
  width: number;
  targetWidth: number;
  color: string;
  speed: number;
  alpha: number;
  targetAlpha: number;
  blur: number;
  delay: number;
}

export function NetflixIntro({ onComplete, autoPlayAudio = true }: NetflixIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<"spark" | "monogram" | "explode" | "dissolve">("spark");
  const [isMuted, setIsMuted] = useState(!autoPlayAudio);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Play synthetic cinematic "Ta-dum" using Web Audio API
  const playTaDum = useCallback(() => {
    setIsMuted(false);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // 1. First impact ("TA"): Sharp metallic cinema strike (t = 0)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.16);

      gain1.gain.setValueAtTime(0.65, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // 2. Second massive cinematic chord ("DUM"): Sub-bass boom + resonant brass swell (t = 0.22)
      const tDum = now + 0.22;

      // Deep sub-bass boom (40Hz chest thud)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(85, tDum);
      subOsc.frequency.exponentialRampToValueAtTime(32, tDum + 1.2);

      subGain.gain.setValueAtTime(0.9, tDum);
      subGain.gain.exponentialRampToValueAtTime(0.001, tDum + 1.8);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(tDum);
      subOsc.stop(tDum + 1.8);

      // Multi-voice brass swell (D minor cinema chord: D2, A2, D3, F3, A3, D4)
      const notes = [73.42, 110.0, 146.83, 174.61, 220.0, 293.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        // Gentle analog detune
        osc.frequency.setValueAtTime(freq * (1 + (idx % 2 === 0 ? 0.006 : -0.006)), tDum);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(380, tDum);
        filter.frequency.exponentialRampToValueAtTime(2200, tDum + 0.45);
        filter.frequency.exponentialRampToValueAtTime(200, tDum + 2.2);

        gain.gain.setValueAtTime(0.001, tDum);
        gain.gain.linearRampToValueAtTime(0.18, tDum + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, tDum + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(tDum);
        osc.stop(tDum + 2.2);
      });

      // Anvil shimmer chime
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(587.33, tDum); // D5
      shimmerGain.gain.setValueAtTime(0.15, tDum);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, tDum + 1.2);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.start(tDum);
      shimmer.stop(tDum + 1.2);

      setIsMuted(false);
    } catch {
      // Audio autoplay policy blocked until gesture
      setIsMuted(true);
    }
  }, []);

  // Complete and exit intro
  const handleExit = useCallback(() => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [isFadingOut, onComplete]);

  // Keyboard skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExit]);

  // Main animation timeline & Canvas ribbon explosion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext("2d") : null;
    } catch {
      // Fallback for environments without canvas support (e.g. jsdom / SSR)
    }

    let width = (canvas.width = window.innerWidth || 1920);
    let height = (canvas.height = window.innerHeight || 1080);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth || 1920;
      height = canvas.height = window.innerHeight || 1080;
    };
    window.addEventListener("resize", handleResize);

    // Initialize 60 vertical colored light ribbons
    const ribbonCount = Math.min(65, Math.max(35, Math.floor(width / 22)));
    const ribbons: LightRibbon[] = [];
    const centerX = width / 2;

    for (let i = 0; i < ribbonCount; i++) {
      const spreadRatio = (i / (ribbonCount - 1) - 0.5) * 2; // -1 to +1
      // Non-linear distribution: denser near center, expanding outward
      const targetX = centerX + Math.sign(spreadRatio) * Math.pow(Math.abs(spreadRatio), 0.85) * (width * 0.58);
      const startX = centerX + (Math.random() - 0.5) * 120;
      const col = SPECTRUM_COLORS[i % SPECTRUM_COLORS.length];

      ribbons.push({
        x: startX,
        targetX,
        width: 3 + Math.random() * 4,
        targetWidth: 8 + Math.random() * 26,
        color: col,
        speed: 1.2 + Math.random() * 1.8,
        alpha: 0,
        targetAlpha: 0.75 + Math.random() * 0.25,
        blur: 4 + Math.random() * 12,
        delay: Math.abs(spreadRatio) * 0.28 + Math.random() * 0.12,
      });
    }

    startTimeRef.current = performance.now();

    // Trigger sounds & phase milestones
    const timerTaDum = setTimeout(() => {
      setPhase("monogram");
      if (!isMuted) {
        playTaDum();
      }
    }, 700);

    const timerExplode = setTimeout(() => {
      setPhase("explode");
    }, 1600);

    const timerDissolve = setTimeout(() => {
      setPhase("dissolve");
      setIsFadingOut(true);
    }, 3250);

    const timerFinish = setTimeout(() => {
      onComplete();
    }, 3750);

    // Canvas animation loop
    const render = (now: number) => {
      if (!ctx) return;
      const elapsed = (now - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, width, height);

      // Ribbon light explosion starts at 1.55s
      if (elapsed >= 1.55) {
        const explodeProgress = Math.min(1, (elapsed - 1.55) / 1.5);
        const hyperSpeed = Math.pow(explodeProgress, 2.2);

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        for (let i = 0; i < ribbons.length; i++) {
          const r = ribbons[i];
          const localTime = Math.max(0, elapsed - 1.55 - r.delay);
          if (localTime <= 0) continue;

          const progress = Math.min(1, localTime * r.speed);
          const ribbonEase = 1 - Math.pow(1 - progress, 2.5);

          // Interpolate current X position and width
          const currentX = r.x + (r.targetX - r.x) * ribbonEase;
          const currentWidth = r.width + (r.targetWidth - r.width) * ribbonEase * (1 + hyperSpeed * 1.5);

          // Alpha fades in then dissolves near end
          let alpha = r.targetAlpha * Math.min(1, localTime * 4);
          if (elapsed > 2.85) {
            alpha *= Math.max(0, 1 - (elapsed - 2.85) / 0.5);
          }

          if (alpha <= 0.01) continue;

          // Vertical linear gradient with bright center and soft edge bleed
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(0.2, r.color);
          grad.addColorStop(0.5, "#FFFFFF");
          grad.addColorStop(0.8, r.color);
          grad.addColorStop(1, "rgba(0,0,0,0)");

          ctx.fillStyle = grad;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = r.color;
          ctx.shadowBlur = r.blur * (1 + hyperSpeed * 0.8);

          // Draw vertical ribbon with slight dynamic slant for cinema perspective
          const skewX = (currentX - centerX) * 0.12 * hyperSpeed;
          ctx.beginPath();
          ctx.moveTo(currentX - currentWidth / 2 - skewX, 0);
          ctx.lineTo(currentX + currentWidth / 2 - skewX, 0);
          ctx.lineTo(currentX + currentWidth / 2 + skewX, height);
          ctx.lineTo(currentX - currentWidth / 2 + skewX, height);
          ctx.closePath();
          ctx.fill();
        }

        // Central white-hot anamorphic lens flare flash
        if (elapsed >= 1.65 && elapsed <= 2.8) {
          const flareProgress = (elapsed - 1.65) / 1.15;
          const flareAlpha = Math.sin(flareProgress * Math.PI) * 0.85;

          const flareGrad = ctx.createRadialGradient(centerX, height / 2, 2, centerX, height / 2, width * 0.45);
          flareGrad.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha})`);
          flareGrad.addColorStop(0.15, `rgba(229, 9, 20, ${flareAlpha * 0.85})`);
          flareGrad.addColorStop(0.5, `rgba(180, 0, 50, ${flareAlpha * 0.3})`);
          flareGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = flareGrad;
          ctx.globalAlpha = flareAlpha;
          ctx.fillRect(0, 0, width, height);

          // Anamorphic horizontal laser line
          ctx.fillStyle = `rgba(255, 255, 255, ${flareAlpha * 0.9})`;
          ctx.shadowColor = "#FF3B4E";
          ctx.shadowBlur = 25;
          ctx.fillRect(0, height / 2 - 2, width, 4);
        }

        ctx.restore();
      }

      if (elapsed < 3.8) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timerTaDum);
      clearTimeout(timerExplode);
      clearTimeout(timerDissolve);
      clearTimeout(timerFinish);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [onComplete, playTaDum, isMuted]);

  // Handle first user click anywhere to enable audio and full theater feel
  const handleUserTap = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playTaDum();
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleUserTap}
      className={cn(
        "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black select-none overflow-hidden cursor-pointer transition-opacity duration-500 ease-out",
        isFadingOut ? "opacity-0 pointer-events-none scale-105" : "opacity-100",
      )}
      style={{
        background: "radial-gradient(circle at center, #140203 0%, #060101 45%, #000000 100%)",
      }}
      aria-label="Netflix Intro PhimHub"
    >
      {/* Dynamic Canvas for Exploding Ribbons & Spectrum Light Lines */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-none z-20"
      />

      {/* Atmospheric Ambient Red Glow */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-all duration-1000",
          phase === "spark" && "opacity-20 scale-95",
          phase === "monogram" && "opacity-75 scale-100",
          phase === "explode" && "opacity-100 scale-125",
          phase === "dissolve" && "opacity-0 scale-150",
        )}
        style={{
          background: "radial-gradient(ellipse at center, rgba(229,9,20,0.35) 0%, rgba(138,5,12,0.15) 40%, rgba(0,0,0,0) 75%)",
        }}
      />

      {/* Center 3D Netflix-style Monogram & Typography */}
      <div
        className={cn(
          "relative z-30 flex flex-col items-center justify-center transition-all duration-700 ease-out will-change-transform",
          phase === "spark" && "scale-75 opacity-0 blur-sm",
          phase === "monogram" && "scale-100 opacity-100 blur-0",
          phase === "explode" && "scale-125 opacity-0 blur-md transition-all duration-300",
          phase === "dissolve" && "scale-150 opacity-0 blur-xl",
        )}
      >
        {/* The 3D Sculpted Ribbon Emblem (PhimHub Cinema Monogram) */}
        <div className="relative flex items-center justify-center mb-5 sm:mb-7">
          <div className="relative size-24 sm:size-32 md:size-36 flex items-center justify-center">
            {/* Ribbon Glow Halo */}
            <div className="absolute inset-0 rounded-3xl bg-[#E50914]/40 blur-2xl animate-pulse" />

            {/* SVG 3D Ribbon Monogram "P" with Overlapping Ribbon Folds */}
            <svg
              viewBox="0 0 100 120"
              className="size-full drop-shadow-[0_15px_30px_rgba(229,9,20,0.85)] filter"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Left vertical ribbon pillar */}
                <linearGradient id="netflixRibbonLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8A050C" />
                  <stop offset="50%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#B20710" />
                </linearGradient>

                {/* Diagonal sash ribbon (signature Netflix depth fold) */}
                <linearGradient id="netflixRibbonCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF2E3D" />
                  <stop offset="50%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#96050B" />
                </linearGradient>

                {/* Curved loop fold */}
                <linearGradient id="netflixRibbonLoop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF4A58" />
                  <stop offset="60%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#8A050C" />
                </linearGradient>

                {/* Chrome light sheen filter */}
                <linearGradient id="lightSheen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.7)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>

              {/* Back Drop Shadow of Ribbon */}
              <path
                d="M20 10 L40 10 L40 110 L20 110 Z"
                fill="#3A0003"
                opacity="0.9"
              />

              {/* Main Vertical Left Stem */}
              <path
                d="M22 10 L38 10 L38 110 L22 110 Z"
                fill="url(#netflixRibbonLeft)"
              />

              {/* Upper Loop Ribbon (Letter P) */}
              <path
                d="M38 10 C68 10, 85 24, 85 42 C85 60, 68 74, 38 74 L38 56 C58 56, 67 48, 67 42 C67 36, 58 28, 38 28 Z"
                fill="url(#netflixRibbonLoop)"
              />

              {/* Diagonal Play Triangle (PhimHub Play Symbol Embedded in Ribbon) */}
              <polygon
                points="46,28 64,42 46,56"
                fill="#FFFFFF"
                className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              />

              {/* Diagonal Ribbon Overlay with Shadow Cast */}
              <path
                d="M38 10 L58 10 L38 48 L22 48 Z"
                fill="url(#netflixRibbonCenter)"
                opacity="0.95"
              />
            </svg>
          </div>
        </div>

        {/* Cinematic Netflix-style Brand Title: PHIMHUB */}
        <div className="flex flex-col items-center">
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.35em] sm:tracking-[0.45em] text-white uppercase drop-shadow-[0_4px_24px_rgba(229,9,20,0.7)] ml-3 sm:ml-4">
            PHIM<span className="text-[#E50914] drop-shadow-[0_0_20px_#E50914]">HUB</span>
          </h1>

          <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase text-white/50 ml-1">
            CINEMATIC STREAMING
          </p>
        </div>
      </div>

      {/* Top Controls: Sound Toggle & Skip Button */}
      <div className="absolute top-5 inset-x-5 z-40 flex items-center justify-between">
        {/* Sound state badge / toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMuted) {
              playTaDum();
            } else {
              setIsMuted(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:border-white/30 backdrop-blur-md transition-all active:scale-95"
          title={isMuted ? "Bật âm thanh intro Ta-dum" : "Tắt âm thanh"}
        >
          {isMuted ? (
            <>
              <VolumeX className="size-3.5 text-white/60" />
              <span className="text-[11px]">Bật âm thanh</span>
            </>
          ) : (
            <>
              <Volume2 className="size-3.5 text-[#E50914] animate-pulse" />
              <span className="text-[11px] text-white">Âm thanh bật</span>
            </>
          )}
        </button>

        {/* Skip button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExit();
          }}
          className="group flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md transition-all duration-150 hover:border-white hover:bg-white hover:text-black active:scale-95 cursor-pointer"
          title="Bỏ qua intro (Phím Esc hoặc Space)"
        >
          <span>Bỏ qua</span>
          <FastForward className="size-3.5 fill-current transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Subtle bottom hint */}
      <div className="absolute bottom-5 text-[11px] text-white/30 tracking-wider font-medium pointer-events-none z-30">
        Bấm bất kỳ đâu hoặc phím Space để bỏ qua
      </div>
    </div>
  );
}
