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

// Ultra-smooth cinema easing curves
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Pre-render a soft glowing vertical ribbon sprite once per unique color.
// Using drawImage with a pre-baked glow sprite eliminates per-frame shadowBlur
// and per-frame createLinearGradient allocations (the #1 cause of canvas stutter).
function createRibbonSprite(color: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const sprite = document.createElement("canvas");
  sprite.width = 48;
  sprite.height = 256;
  const sctx = sprite.getContext?.("2d");
  if (!sctx) return null;

  // 1. Horizontal soft glow profile (transparent edges -> color halo -> bright core)
  const hGrad = sctx.createLinearGradient(0, 0, sprite.width, 0);
  hGrad.addColorStop(0, "rgba(0,0,0,0)");
  hGrad.addColorStop(0.22, `${color}55`);
  hGrad.addColorStop(0.4, color);
  hGrad.addColorStop(0.5, "#FFFFFF");
  hGrad.addColorStop(0.6, color);
  hGrad.addColorStop(0.78, `${color}55`);
  hGrad.addColorStop(1, "rgba(0,0,0,0)");

  sctx.fillStyle = hGrad;
  sctx.fillRect(0, 0, sprite.width, sprite.height);

  // 2. Vertical pole fade (transparent top/bottom -> full intensity center)
  sctx.globalCompositeOperation = "destination-in";
  const vGrad = sctx.createLinearGradient(0, 0, 0, sprite.height);
  vGrad.addColorStop(0, "rgba(0,0,0,0)");
  vGrad.addColorStop(0.18, "rgba(0,0,0,0.85)");
  vGrad.addColorStop(0.5, "rgba(0,0,0,1)");
  vGrad.addColorStop(0.82, "rgba(0,0,0,0.85)");
  vGrad.addColorStop(1, "rgba(0,0,0,0)");

  sctx.fillStyle = vGrad;
  sctx.fillRect(0, 0, sprite.width, sprite.height);

  return sprite;
}

// Pre-render anamorphic radial halo sprite once on mount
function createFlareSprite(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const sprite = document.createElement("canvas");
  sprite.width = 256;
  sprite.height = 256;
  const sctx = sprite.getContext?.("2d");
  if (!sctx) return null;

  const r = 128;
  const grad = sctx.createRadialGradient(r, r, 2, r, r, r);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.16, "rgba(229, 9, 20, 0.8)");
  grad.addColorStop(0.5, "rgba(180, 0, 40, 0.28)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  return sprite;
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
  const onCompleteRef = useRef(onComplete);
  const isMutedRef = useRef(!autoPlayAudio);

  const [isMuted, setIsMuted] = useState(!autoPlayAudio);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  onCompleteRef.current = onComplete;
  isMutedRef.current = isMuted;

  // Synthesize authentic cinema "Ta-dum" chord via Web Audio API
  const playTaDum = useCallback(() => {
    isMutedRef.current = false;
    setIsMuted(false);
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    } catch {
      // Audio autoplay policy handled gracefully
      isMutedRef.current = true;
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
      animFrameRef.current = null;
    }

    setTimeout(() => {
      onCompleteRef.current();
    }, 400);
  }, []);

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

  // Main 60/120 FPS Render Loop & Horizontal Curtain Ribbon Expansion
  // Note: Dependencies are strictly stable so toggling mute or parent renders NEVER restart the animation!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext("2d", { alpha: true }) : null;
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

    // Pre-render ribbon glow sprites once per unique spectrum color + flare sprite
    const canUseSprites = Boolean(
      ctx && typeof ctx.drawImage === "function" && typeof ctx.setTransform === "function",
    );
    const spriteCache = new Map<string, HTMLCanvasElement>();
    if (canUseSprites) {
      for (const color of SPECTRUM_COLORS) {
        if (!spriteCache.has(color)) {
          const sprite = createRibbonSprite(color);
          if (sprite) spriteCache.set(color, sprite);
        }
      }
    }
    const flareSprite = canUseSprites ? createFlareSprite() : null;

    // Generate symmetrical ribbons expanding outwards to LEFT and RIGHT
    const ribbonPairCount = Math.min(30, Math.max(18, Math.floor(width / 60)));
    const ribbons: (LateralRibbon & { sprite: HTMLCanvasElement | null })[] = [];
    const centerX = width / 2;

    for (let i = 0; i < ribbonPairCount; i++) {
      const spreadRatio = (i + 1) / ribbonPairCount; // 0 to 1
      const col = SPECTRUM_COLORS[i % SPECTRUM_COLORS.length];
      const sprite = spriteCache.get(col) ?? null;

      // Distance to left and right edges
      const lateralDistance = Math.pow(spreadRatio, 0.8) * (width * 0.56 + 100);
      const delay = Math.pow(spreadRatio, 1.35) * 0.26 + Math.random() * 0.06;

      // 1. Left-expanding ribbon (side: -1)
      ribbons.push({
        side: -1,
        startX: centerX - Math.random() * 14,
        targetX: centerX - lateralDistance,
        startWidth: 6 + Math.random() * 6,
        targetWidth: 22 + Math.random() * 44,
        color: col,
        speed: 1.2 + Math.random() * 1.15,
        delay,
        alpha: 0,
        targetAlpha: 0.78 + Math.random() * 0.22,
        blur: 0,
        sprite,
      });

      // 2. Right-expanding ribbon (side: +1)
      ribbons.push({
        side: 1,
        startX: centerX + Math.random() * 14,
        targetX: centerX + lateralDistance,
        startWidth: 6 + Math.random() * 6,
        targetWidth: 22 + Math.random() * 44,
        color: col,
        speed: 1.2 + Math.random() * 1.15,
        delay,
        alpha: 0,
        targetAlpha: 0.78 + Math.random() * 0.22,
        blur: 0,
        sprite,
      });
    }

    startTimeRef.current = 0;

    // Trigger audio at exact moment without restarting the animation loop
    let audioPlayed = false;
    const audioTriggerTimer = setTimeout(() => {
      if (!audioPlayed && !isMutedRef.current) {
        audioPlayed = true;
        playTaDum();
      }
    }, 650);

    // Auto complete when intro ends
    const exitTimer = setTimeout(() => {
      handleExit();
    }, 3550);

    // Single unified requestAnimationFrame loop:
    // Pure GPU transforms + pre-baked sprite blits = locked 60/120 FPS with zero jank!
    const render = (now: number) => {
      if (completedRef.current) return;

      // Anchor t=0 on the very first painted animation frame so initial mount latency never skips frames
      if (startTimeRef.current === 0) {
        startTimeRef.current = now;
      }

      const elapsed = Math.max(0, (now - startTimeRef.current) / 1000);
      const currentCenterX = width / 2;

      // 1. Smooth Monogram Animation (GPU compositor transform + opacity only)
      if (monogramRef.current) {
        if (elapsed < 0.65) {
          // Entrance: Smooth fade-in + subtle cinema push-in
          const inProgress = Math.min(1, elapsed / 0.65);
          const easeIn = easeOutCubic(inProgress);
          const scale = 0.93 + easeIn * 0.07;
          monogramRef.current.style.opacity = `${easeIn}`;
          monogramRef.current.style.transform = `translate3d(0, 0, 0) scale(${scale})`;
        } else if (elapsed < 1.25) {
          // Gentle continuous drift (1.0 -> 1.03) so transition to expansion has zero velocity snap
          const holdProgress = (elapsed - 0.65) / 0.6;
          const drift = easeInOutSine(holdProgress);
          const scale = 1 + drift * 0.03;
          monogramRef.current.style.opacity = "1";
          monogramRef.current.style.transform = `translate3d(0, 0, 0) scale(${scale})`;
        } else if (elapsed <= 2.2) {
          // Horizontal stretch into lateral ribbons
          const stretchProgress = Math.min(1, (elapsed - 1.25) / 0.65);
          const stretchEase = easeOutQuart(stretchProgress);
          const scaleX = 1.03 + stretchEase * 2.8;
          const scaleY = 1.03 - stretchEase * 0.03;
          const opacity = Math.max(0, 1 - easeOutCubic(Math.min(1, stretchProgress * 1.2)));
          monogramRef.current.style.opacity = `${opacity}`;
          monogramRef.current.style.transform = `translate3d(0, 0, 0) scale(${scaleX}, ${scaleY})`;
        } else {
          monogramRef.current.style.opacity = "0";
        }
      }

      // 2. Ambient Red Glow Animation (no CSS transition fighting rAF!)
      if (ambientGlowRef.current) {
        if (elapsed < 1.25) {
          const glowAlpha = easeOutCubic(Math.min(1, elapsed / 1.1)) * 0.78;
          ambientGlowRef.current.style.opacity = `${glowAlpha}`;
          ambientGlowRef.current.style.transform = "translate3d(0, 0, 0) scaleX(1)";
        } else if (elapsed < 2.65) {
          const lateralGlow = Math.min(1, (elapsed - 1.25) / 1.1);
          const glowEase = easeOutCubic(lateralGlow);
          ambientGlowRef.current.style.opacity = `${0.78 * (1 - glowEase * 0.85)}`;
          ambientGlowRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${1 + glowEase * 1.6})`;
        } else {
          ambientGlowRef.current.style.opacity = "0";
        }
      }

      // 3. Canvas Spectrum Ribbons & Anamorphic Flare (Zero shadowBlur, zero per-frame gradients)
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        if (elapsed >= 1.25) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";

          const explodeProgress = Math.min(1, (elapsed - 1.25) / 1.65);
          const hyperSpeed = explodeProgress * explodeProgress;

          for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const localTime = elapsed - 1.25 - r.delay;
            if (localTime <= 0) continue;

            const progress = Math.min(1, localTime * r.speed);
            const ribbonEase = easeOutQuart(progress);

            const currentX = r.startX + (r.targetX - r.startX) * ribbonEase;
            const currentWidth =
              r.startWidth + (r.targetWidth - r.startWidth) * ribbonEase * (1 + hyperSpeed * 1.15);

            // Smooth fade in and lateral dissolve
            let alpha = r.targetAlpha * easeOutCubic(Math.min(1, localTime / 0.22));
            if (elapsed > 2.55) {
              alpha *= Math.max(0, 1 - easeInOutSine(Math.min(1, (elapsed - 2.55) / 0.65)));
            }

            if (alpha <= 0.01) continue;

            // Slight perspective tilt fanning outward left/right
            const lateralLean = (currentX - currentCenterX) * 0.06 * hyperSpeed;

            if (r.sprite && canUseSprites) {
              const skewX = (2 * lateralLean) / Math.max(1, height);
              ctx.globalAlpha = alpha;
              ctx.setTransform(1, 0, skewX, 1, currentX - lateralLean, 0);
              ctx.drawImage(r.sprite, -currentWidth / 2, 0, currentWidth, height);
            } else {
              // Lightweight fallback for mocked test contexts
              ctx.globalAlpha = alpha;
              ctx.fillStyle = r.color;
              ctx.beginPath();
              ctx.moveTo(currentX - currentWidth / 2 - lateralLean, 0);
              ctx.lineTo(currentX + currentWidth / 2 - lateralLean, 0);
              ctx.lineTo(currentX + currentWidth / 2 + lateralLean, height);
              ctx.lineTo(currentX - currentWidth / 2 + lateralLean, height);
              ctx.closePath();
              ctx.fill();
            }
          }

          if (canUseSprites) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }

          // Horizontal Anamorphic Lens Flare
          if (elapsed >= 1.3 && elapsed <= 2.8) {
            const flareElapsed = elapsed - 1.3;
            const flareProgress = Math.min(1, flareElapsed / 1.5);
            const flareAlpha = Math.sin(flareProgress * Math.PI) * 0.9;
            const flareWidth = Math.min(width, easeOutQuart(Math.min(1, flareElapsed / 0.45)) * width);
            const flareLeft = currentCenterX - flareWidth / 2;

            // 1. Crisp horizontal laser beam core + soft glow halo (no shadowBlur!)
            ctx.globalAlpha = flareAlpha * 0.35;
            ctx.fillStyle = "#FF2E4C";
            ctx.fillRect(flareLeft, height / 2 - 5, flareWidth, 10);

            ctx.globalAlpha = flareAlpha;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(flareLeft, height / 2 - 1.5, flareWidth, 3);

            // 2. Pre-rendered radial flare sprite
            if (flareSprite && canUseSprites) {
              const radius = Math.max(24, flareWidth * 0.45);
              ctx.globalAlpha = flareAlpha * 0.78;
              ctx.drawImage(
                flareSprite,
                currentCenterX - radius,
                height / 2 - radius * 0.65,
                radius * 2,
                radius * 1.3,
              );
            }
          }

          ctx.restore();
        }
      }

      if (elapsed < 3.6 && !completedRef.current) {
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
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [handleExit, playTaDum]);

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
        "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black select-none overflow-hidden cursor-pointer transition-opacity duration-400 ease-out",
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      style={{
        background: "radial-gradient(ellipse at center, #150203 0%, #080101 45%, #000000 100%)",
        contain: "layout style paint",
      }}
      aria-label="Netflix Intro PhimHub"
    >
      {/* Dynamic Canvas for Horizontal Spectrum Ribbons & Anamorphic Flare */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-none z-20"
      />

      {/* Atmospheric Ambient Red Glow (Pure compositor transform + opacity, no CSS transition fighting rAF) */}
      <div
        ref={ambientGlowRef}
        className="absolute inset-0 pointer-events-none will-change-[transform,opacity] opacity-0"
        style={{
          background: "radial-gradient(ellipse 75% 45% at center, rgba(229,9,20,0.34) 0%, rgba(138,5,12,0.12) 45%, transparent 75%)",
        }}
      />

      {/* Center 3D Netflix-style Monogram & Typography: GPU-composited transform + opacity */}
      <div
        ref={monogramRef}
        className="relative z-30 flex flex-col items-center justify-center will-change-[transform,opacity] opacity-0"
        style={{
          transformOrigin: "center center",
        }}
      >
        {/* The 3D Sculpted Ribbon Emblem (PhimHub Cinema Monogram) */}
        <div className="relative flex items-center justify-center mb-5 sm:mb-6">
          <div className="relative size-28 sm:size-36 md:size-40 flex items-center justify-center">
            {/* Soft radial halo (zero blur-filter repaint cost during scaleX) */}
            <div
              className="absolute -inset-8 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(229,9,20,0.42) 0%, rgba(229,9,20,0.12) 45%, transparent 72%)",
              }}
            />

            {/* SVG 3D Ribbon Monogram "P" with Signature Interlocking 3D Folds & Specular Sheen */}
            <svg
              viewBox="0 0 130 150"
              className="size-full"
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
              </defs>

              {/* Back drop shadow of the vertical stem */}
              <path d="M 27 15 L 53 15 L 53 139 Q 40 144 27 139 Z" fill="#180001" opacity="0.9" />

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

              {/* Vector shadow behind diagonal sash (avoids expensive SVG feDropShadow filter) */}
              <path d="M 54 15 L 79 15 L 53 72 L 28 72 Z" fill="rgba(0,0,0,0.55)" />

              {/* Diagonal Ribbon Sash Overlap (Signature 3D Ribbon Twist) */}
              <path
                d="M 51 12 L 76 12 L 50 68 L 25 68 Z"
                fill="url(#ribbonSash)"
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
          <h1 className="flex items-center text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.16em] sm:tracking-[0.2em] uppercase leading-none">
            <span className="bg-gradient-to-b from-white via-[#F5F5F7] to-[#D1D1D6] bg-clip-text text-transparent">
              PHIM
            </span>
            <span className="bg-gradient-to-b from-[#FF4D5A] via-[#E50914] to-[#A8030B] bg-clip-text text-transparent">
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
          <div className="mt-3.5 sm:mt-4.5 w-60 sm:w-80 md:w-96 h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/70 to-transparent shadow-[0_0_14px_rgba(229,9,20,0.8)]" />
        </div>
      </div>

      {/* Top Controls: Sound Toggle & Skip Button (no backdrop-blur-md over 60fps canvas) */}
      <div className="absolute top-5 inset-x-5 z-40 flex items-center justify-between">
        {/* Sound state badge / toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMuted) {
              playTaDum();
            } else {
              isMutedRef.current = true;
              setIsMuted(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:border-white/30 transition-colors active:scale-95 cursor-pointer"
          title={isMuted ? "Bật âm thanh intro Ta-dum" : "Tắt âm thanh"}
        >
          {isMuted ? (
            <>
              <VolumeX className="size-3.5 text-white/60" />
              <span className="text-[11px]">Bật âm thanh</span>
            </>
          ) : (
            <>
              <Volume2 className="size-3.5 text-[#E50914]" />
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
          className="group flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl transition-colors duration-150 hover:border-white hover:bg-white hover:text-black active:scale-95 cursor-pointer"
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