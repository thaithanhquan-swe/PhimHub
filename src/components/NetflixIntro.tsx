import { FastForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface NetflixIntroProps {
  onComplete: () => void;
  autoPlayAudio?: boolean;
}

// Authentic Netflix spectrum palette for the expanding lateral ribbons
const SPECTRUM_COLORS = [
  "#E50914", // Signature Netflix Red
  "#FF1E27", // Electric Scarlet
  "#B81D24", // Deep Cinema Crimson
  "#FF2E4C", // Vivid Cherry
  "#FF5E3A", // Warm Radiant Amber
  "#FF0055", // Neon Magenta
  "#9D00FF", // Imperial Violet
  "#6E0DD0", // Deep Purple
  "#E50914", // Red Core
  "#FF3366", // Rose Red
  "#00D2FF", // Electric Cyan Beam
  "#E50914", // Red Core
  "#FF8A00", // Amber Flare
  "#D80027", // Blood Red
  "#FF1493", // Deep Pink
  "#E50914", // Primary Red
];

interface LateralRibbon {
  side: -1 | 1; // -1 = expands to left, +1 = expands to right
  startX: number;
  targetX: number;
  startWidth: number;
  targetWidth: number;
  color: string;
  speed: number;
  delay: number;
  alpha: number;
  targetAlpha: number;
  blur: number;
}

// Ultra-smooth cinema cubic easing
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function NetflixIntro({ onComplete, autoPlayAudio = true }: NetflixIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const monogramRef = useRef<HTMLDivElement | null>(null);
  const ambientGlowRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const [isMuted, setIsMuted] = useState(!autoPlayAudio);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Synthesize authentic cinema "Ta-dum" chord via Web Audio API
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

      // 1. First strike: "TA" (Sharp cinematic anvil tap at t = 0)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(145, now);
      osc1.frequency.exponentialRampToValueAtTime(42, now + 0.18);

      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // 2. Second strike: "DUM" (Sub-bass chest thud + rich brass swell at t = 0.22s)
      const tDum = now + 0.22;

      // Deep sub-bass boom (40Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(82, tDum);
      subOsc.frequency.exponentialRampToValueAtTime(32, tDum + 1.4);

      subGain.gain.setValueAtTime(0.95, tDum);
      subGain.gain.exponentialRampToValueAtTime(0.001, tDum + 1.9);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(tDum);
      subOsc.stop(tDum + 1.9);

      // Multi-voice brass swell (D minor cinematic chord)
      const notes = [73.42, 110.0, 146.83, 174.61, 220.0, 293.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq * (1 + (idx % 2 === 0 ? 0.005 : -0.005)), tDum);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(380, tDum);
        filter.frequency.exponentialRampToValueAtTime(2400, tDum + 0.45);
        filter.frequency.exponentialRampToValueAtTime(220, tDum + 2.2);

        gain.gain.setValueAtTime(0.001, tDum);
        gain.gain.linearRampToValueAtTime(0.2, tDum + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, tDum + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(tDum);
        osc.stop(tDum + 2.2);
      });

      // Anamorphic shimmer chime
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(587.33, tDum); // D5
      shimmerGain.gain.setValueAtTime(0.16, tDum);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, tDum + 1.3);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmer.start(tDum);
      shimmer.stop(tDum + 1.3);

      setIsMuted(false);
    } catch {
      // Audio autoplay policy handled gracefully
      setIsMuted(true);
    }
  }, []);

  // Complete and exit intro smoothly
  const handleExit = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFadingOut(true);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    setTimeout(() => {
      onComplete();
    }, 400);
  }, [onComplete]);

  // Keyboard shortcut listener (Esc / Space / Enter)
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

  // Main 60 FPS Render Loop & Horizontal Curtain Ribbon Expansion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext("2d") : null;
    } catch {
      // Fallback for headless environments
    }

    let width = (canvas.width = window.innerWidth || 1920);
    let height = (canvas.height = window.innerHeight || 1080);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth || 1920;
      height = canvas.height = window.innerHeight || 1080;
    };
    window.addEventListener("resize", handleResize);

    // Generate symmetrical ribbons expanding outwards to LEFT and RIGHT
    const ribbonPairCount = Math.min(38, Math.max(22, Math.floor(width / 50)));
    const ribbons: LateralRibbon[] = [];
    const centerX = width / 2;

    for (let i = 0; i < ribbonPairCount; i++) {
      const spreadRatio = (i + 1) / ribbonPairCount; // 0 to 1
      const col = SPECTRUM_COLORS[i % SPECTRUM_COLORS.length];

      // Distance to left and right edges
      const lateralDistance = Math.pow(spreadRatio, 0.78) * (width * 0.56 + 120);
      const delay = Math.pow(spreadRatio, 1.4) * 0.28 + (Math.random() * 0.08);

      // 1. Left-expanding ribbon (side: -1)
      ribbons.push({
        side: -1,
        startX: centerX - (Math.random() * 18),
        targetX: centerX - lateralDistance,
        startWidth: 3 + Math.random() * 3,
        targetWidth: 10 + Math.random() * 30,
        color: col,
        speed: 1.35 + Math.random() * 1.5,
        delay,
        alpha: 0,
        targetAlpha: 0.8 + Math.random() * 0.2,
        blur: 5 + Math.random() * 14,
      });

      // 2. Right-expanding ribbon (side: +1)
      ribbons.push({
        side: 1,
        startX: centerX + (Math.random() * 18),
        targetX: centerX + lateralDistance,
        startWidth: 3 + Math.random() * 3,
        targetWidth: 10 + Math.random() * 30,
        color: col,
        speed: 1.35 + Math.random() * 1.5,
        delay,
        alpha: 0,
        targetAlpha: 0.8 + Math.random() * 0.2,
        blur: 5 + Math.random() * 14,
      });
    }

    startTimeRef.current = performance.now();

    // Trigger audio at exact moment
    let audioPlayed = false;
    const audioTriggerTimer = setTimeout(() => {
      if (!audioPlayed && !isMuted) {
        audioPlayed = true;
        playTaDum();
      }
    }, 650);

    // Auto complete when intro ends
    const exitTimer = setTimeout(() => {
      handleExit();
    }, 3600);

    // Single unified 60 FPS requestAnimationFrame loop:
    // Pure time-based interpolation with zero React state re-rendering jank!
    const render = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;

      // 1. Smooth Monogram Animation (Direct DOM Ref update = 0 React re-renders)
      if (monogramRef.current) {
        if (elapsed < 0.65) {
          // Entrance: Smooth fade-in, perfectly centered, NO vertical bounce
          const inProgress = Math.min(1, elapsed / 0.65);
          const easeIn = easeOutCubic(inProgress);
          monogramRef.current.style.opacity = `${easeIn}`;
          monogramRef.current.style.transform = `scale(1) translate3d(0, 0, 0)`;
        } else if (elapsed >= 0.65 && elapsed < 1.3) {
          // Stable centered presence with breathing glow
          monogramRef.current.style.opacity = "1";
          monogramRef.current.style.transform = `scale(1) translate3d(0, 0, 0)`;
        } else if (elapsed >= 1.3 && elapsed <= 2.2) {
          // THE HORIZONTAL EXPANSION: Monogram stretches sideways into ribbons!
          // Strictly horizontal scaleX expansion, NO vertical bounce!
          const stretchProgress = Math.min(1, (elapsed - 1.3) / 0.55);
          const stretchEase = easeOutCubic(stretchProgress);
          const scaleX = 1 + stretchEase * 2.8; // Expands sideways to both sides
          const opacity = Math.max(0, 1 - stretchEase * 1.35); // Dissolves into light ribbons
          monogramRef.current.style.opacity = `${opacity}`;
          monogramRef.current.style.transform = `scaleX(${scaleX}) scaleY(1) translate3d(0, 0, 0)`;
        } else {
          monogramRef.current.style.opacity = "0";
        }
      }

      // 2. Ambient Red Glow Animation
      if (ambientGlowRef.current) {
        if (elapsed < 1.3) {
          const glowAlpha = Math.min(0.75, elapsed * 0.65);
          ambientGlowRef.current.style.opacity = `${glowAlpha}`;
        } else if (elapsed >= 1.3 && elapsed < 2.5) {
          // Glow expands sideways across widescreen
          const lateralGlow = Math.min(1, (elapsed - 1.3) / 1.0);
          ambientGlowRef.current.style.opacity = `${0.75 + (1 - lateralGlow) * 0.25}`;
          ambientGlowRef.current.style.transform = `scaleX(${1 + lateralGlow * 1.5}) scaleY(1)`;
        } else {
          ambientGlowRef.current.style.opacity = "0";
        }
      }

      // 3. Canvas Spectrum Ribbons & Anamorphic Flare
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        // Ribbon lateral expansion begins at 1.3s
        if (elapsed >= 1.3) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";

          const explodeProgress = Math.min(1, (elapsed - 1.3) / 1.6);
          const hyperSpeed = Math.pow(explodeProgress, 2.0);

          // Render each lateral ribbon expanding to the left or right
          for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const localTime = Math.max(0, elapsed - 1.3 - r.delay);
            if (localTime <= 0) continue;

            const progress = Math.min(1, localTime * r.speed);
            const ribbonEase = easeOutExpo(progress);

            // Interpolate horizontal position: expands from center to left or right
            const currentX = r.startX + (r.targetX - r.startX) * ribbonEase;
            // Width also expands as ribbons fan out
            const currentWidth = r.startWidth + (r.targetWidth - r.startWidth) * ribbonEase * (1 + hyperSpeed * 1.2);

            // Fade in smoothly, then dissolve laterally near 2.7s
            let alpha = r.targetAlpha * Math.min(1, localTime * 5);
            if (elapsed > 2.65) {
              alpha *= Math.max(0, 1 - (elapsed - 2.65) / 0.6);
            }

            if (alpha <= 0.01) continue;

            // Cinema ribbon gradient: transparent at poles, bright core in center
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.18, r.color);
            grad.addColorStop(0.5, "#FFFFFF");
            grad.addColorStop(0.82, r.color);
            grad.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = grad;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = r.color;
            ctx.shadowBlur = r.blur * (1 + hyperSpeed * 0.6);

            // Slight perspective tilt fanning outward left/right
            const lateralLean = (currentX - centerX) * 0.06 * hyperSpeed;

            ctx.beginPath();
            ctx.moveTo(currentX - currentWidth / 2 - lateralLean, 0);
            ctx.lineTo(currentX + currentWidth / 2 - lateralLean, 0);
            ctx.lineTo(currentX + currentWidth / 2 + lateralLean, height);
            ctx.lineTo(currentX - currentWidth / 2 + lateralLean, height);
            ctx.closePath();
            ctx.fill();
          }

          // Horizontal Anamorphic Lens Flare (Shoots across the screen horizontally)
          if (elapsed >= 1.35 && elapsed <= 2.8) {
            const flareElapsed = elapsed - 1.35;
            const flareDuration = 1.45;
            const flareProgress = Math.min(1, flareElapsed / flareDuration);
            const flareAlpha = Math.sin(flareProgress * Math.PI) * 0.9;

            // Horizontal stretch width: shoots out from 0 to full widescreen
            const flareWidth = Math.min(width, (flareElapsed / 0.35) * width);
            const flareLeft = centerX - flareWidth / 2;

            // 1. Horizontal laser beam line
            ctx.fillStyle = `rgba(255, 255, 255, ${flareAlpha})`;
            ctx.shadowColor = "#FF2E4C";
            ctx.shadowBlur = 28;
            ctx.fillRect(flareLeft, height / 2 - 2, flareWidth, 4);

            // 2. Anamorphic halo flare
            const flareGrad = ctx.createRadialGradient(
              centerX,
              height / 2,
              2,
              centerX,
              height / 2,
              Math.max(10, flareWidth * 0.45),
            );
            flareGrad.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha * 0.95})`);
            flareGrad.addColorStop(0.15, `rgba(229, 9, 20, ${flareAlpha * 0.8})`);
            flareGrad.addColorStop(0.5, `rgba(180, 0, 40, ${flareAlpha * 0.3})`);
            flareGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = flareGrad;
            ctx.globalAlpha = flareAlpha * 0.75;
            ctx.fillRect(0, 0, width, height);
          }

          ctx.restore();
        }
      }

      if (elapsed < 3.8 && !completedRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(audioTriggerTimer);
      clearTimeout(exitTimer);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [handleExit, isMuted, playTaDum]);

  // Handle first user gesture anywhere
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
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      style={{
        background: "radial-gradient(ellipse at center, #150203 0%, #080101 45%, #000000 100%)",
      }}
      aria-label="Netflix Intro PhimHub"
    >
      {/* Dynamic Canvas for Horizontal Spectrum Ribbons & Anamorphic Flare */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-none z-20"
      />

      {/* Atmospheric Ambient Red Glow (Expands laterally horizontally) */}
      <div
        ref={ambientGlowRef}
        className="absolute inset-0 pointer-events-none will-change-transform opacity-0"
        style={{
          background: "radial-gradient(ellipse 75% 45% at center, rgba(229,9,20,0.32) 0%, rgba(138,5,12,0.12) 45%, transparent 75%)",
          transition: "opacity 0.5s ease-out",
        }}
      />

      {/* Center 3D Netflix-style Monogram & Typography: Steady Vertical Center, Horizontal Stretch */}
      <div
        ref={monogramRef}
        className="relative z-30 flex flex-col items-center justify-center will-change-transform opacity-0"
        style={{
          transformOrigin: "center center",
        }}
      >
        {/* The 3D Sculpted Ribbon Emblem (PhimHub Cinema Monogram) */}
        <div className="relative flex items-center justify-center mb-5 sm:mb-6">
          <div className="relative size-28 sm:size-36 md:size-40 flex items-center justify-center">
            {/* Ribbon Glow Halo */}
            <div className="absolute inset-0 rounded-full bg-[#E50914]/40 blur-3xl animate-pulse" />

            {/* SVG 3D Ribbon Monogram "P" with Signature Interlocking 3D Folds & Specular Sheen */}
            <svg
              viewBox="0 0 130 150"
              className="size-full drop-shadow-[0_18px_36px_rgba(0,0,0,0.9)] filter"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Cylindrical Pillar Lighting (Signature Netflix Red Depth) */}
                <linearGradient id="ribbonPillar" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6E0005" />
                  <stop offset="22%" stopColor="#B81D24" />
                  <stop offset="55%" stopColor="#E50914" />
                  <stop offset="82%" stopColor="#FF3848" />
                  <stop offset="100%" stopColor="#8C0007" />
                </linearGradient>

                {/* Loop Gradient (Sweeping 3D Arc) */}
                <linearGradient id="ribbonLoop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF4F5E" />
                  <stop offset="35%" stopColor="#E50914" />
                  <stop offset="75%" stopColor="#A10008" />
                  <stop offset="100%" stopColor="#540003" />
                </linearGradient>

                {/* Diagonal Ribbon Sash (Netflix Signature Interlocking Fold) */}
                <linearGradient id="ribbonSash" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF6372" />
                  <stop offset="40%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#7A0005" />
                </linearGradient>

                {/* Specular Light Sheen Reflection */}
                <linearGradient id="specularRim" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>

                {/* Deep Realistic Ribbon Shadow */}
                <filter id="ribbonShadow" x="-25%" y="-25%" width="160%" height="160%">
                  <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Back drop shadow of the vertical stem */}
              <path d="M 25 12 L 51 12 L 51 136 Q 38 141 25 136 Z" fill="#2E0003" opacity="0.85" />

              {/* Vertical Left Ribbon Pillar (with Netflix signature bottom curved smile) */}
              <path d="M 25 12 L 51 12 L 51 134 Q 38 140 25 134 Z" fill="url(#ribbonPillar)" />

              {/* Upper Loop of the "P" Ribbon (Mathematical Golden Ratio Curve) */}
              <path
                d="M 51 12 
                   C 82 12, 108 28, 108 52 
                   C 108 76, 82 92, 51 92 
                   L 51 68 
                   C 70 68, 82 60, 82 52 
                   C 82 44, 70 36, 51 36 
                   Z"
                fill="url(#ribbonLoop)"
              />

              {/* Return fold shadow where loop folds behind pillar */}
              <path d="M 51 68 L 51 92 L 44 92 L 44 68 Z" fill="#200002" opacity="0.75" />

              {/* Diagonal Ribbon Sash Overlap (Signature 3D Ribbon Twist) */}
              <path
                d="M 51 12 L 76 12 L 50 68 L 25 68 Z"
                fill="url(#ribbonSash)"
                filter="url(#ribbonShadow)"
              />

              {/* Specular Highlight Sheen along top rim */}
              <path
                d="M 25 12 L 76 12"
                stroke="url(#specularRim)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Specular Highlight Sheen on the outer loop crest */}
              <path
                d="M 76 16 C 98 26, 108 38, 108 52"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Cinematic Netflix-style Brand Title: PHIMHUB with Flawless Two-Tone Cinema Shading */}
        <div className="flex flex-col items-center">
          <h1 className="flex items-center text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.16em] sm:tracking-[0.2em] uppercase leading-none drop-shadow-[0_8px_28px_rgba(0,0,0,0.9)]">
            <span className="bg-gradient-to-b from-white via-[#F5F5F7] to-[#D1D1D6] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
              PHIM
            </span>
            <span className="bg-gradient-to-b from-[#FF4D5A] via-[#E50914] to-[#A8030B] bg-clip-text text-transparent drop-shadow-[0_0_26px_rgba(229,9,20,0.75)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              HUB
            </span>
          </h1>

          {/* Subtitle Tagline with Cinema Studio Wings */}
          <div className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4">
            <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#E50914]/85" />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.45em] uppercase text-white/75">
              CINEMATIC STREAMING
            </span>
            <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#E50914]/85" />
          </div>

          {/* Anamorphic Horizon Floor Flare */}
          <div className="mt-3.5 sm:mt-4.5 w-60 sm:w-80 md:w-96 h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/70 to-transparent shadow-[0_0_16px_#E50914]" />
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
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:border-white/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
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