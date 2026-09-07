import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Participant, WheelSettings, WheelState } from '../types';
import { soundManager } from '../utils/audio';
import { Play, Sparkles } from 'lucide-react';

interface RouletteWheelProps {
  participants: Participant[];
  settings: WheelSettings;
  wheelState: WheelState;
  onSpinStart: () => void;
  onSpinComplete: (winner: Participant) => void;
  targetWinnerIndex: number | null;
  currentSeed?: string;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  participants,
  settings,
  wheelState,
  onSpinStart,
  onSpinComplete,
  targetWinnerIndex,
  currentSeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flapperRef = useRef<HTMLDivElement | null>(null);

  // Cached offscreen canvas for hardware-accelerated, zero-jank rotation rendering
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCacheValidRef = useRef<boolean>(false);

  // Spring physics for pointer flutter (rendered without triggering React re-renders)
  const flapperSpringRef = useRef<{ angle: number; velocity: number }>({ angle: 0, velocity: 0 });
  const lastSoundTimeRef = useRef<number>(0);

  // Current rotation angle in radians
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  // Wheel size calculation state - default to generous size (680px)
  const [size, setSize] = useState<number>(680);

  // Resize observer to keep canvas responsive and maximize wheel size to fill available stage
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const stage = containerRef.current.parentElement || containerRef.current;

      const stageWidth = stage.clientWidth || window.innerWidth;
      const stageHeight = stage.clientHeight || (window.innerHeight - 110);

      // Compact reserved height: top bar + arrow pointer clearance + bottom status pill
      const reservedHeight = 70;
      const availableHeight = Math.max(stageHeight - reservedHeight, 300);
      const availableWidth = Math.max(stageWidth - 24, 300);

      // Maximize the wheel: take full available space up to 960px for large desktop windows & fullscreen
      const maxDim = Math.min(availableWidth, availableHeight);
      const targetSize = Math.max(Math.min(maxDim, 960), 320);
      setSize(targetSize);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      if (containerRef.current.parentElement) {
        observer.observe(containerRef.current.parentElement);
      }
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Pre-render the entire wheel disk to an offscreen canvas at full DPR
  // This executes once per resize/data change so spinning takes <0.1ms per frame with zero garbage collection
  const updateOffscreenWheel = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = width * dpr;
    offCanvas.height = height * dpr;

    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 14;
    const count = Math.max(participants.length, 1);
    const sliceAngle = (2 * Math.PI) / count;

    // Outer glow and metallic rim shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, 2 * Math.PI);
    const outerGlow = ctx.createRadialGradient(cx, cy, radius, cx, cy, radius + 14);
    outerGlow.addColorStop(0, 'rgba(234, 179, 8, 0.45)');
    outerGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fill();
    ctx.restore();

    // Outer gold/bronze metallic rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, 2 * Math.PI);
    const rimGrad = ctx.createLinearGradient(0, 0, width, height);
    rimGrad.addColorStop(0, '#F59E0B');
    rimGrad.addColorStop(0.25, '#FDE68A');
    rimGrad.addColorStop(0.5, '#B45309');
    rimGrad.addColorStop(0.75, '#FBBF24');
    rimGrad.addColorStop(1, '#78350F');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();

    // Inner track ring (dark casino velvet)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.restore();

    const hubRadius = Math.max(radius * 0.18, 38);
    const scaleFactor = Math.max(size / 560, 0.85);

    // Draw Segments
    if (participants.length === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.font = `bold ${Math.round(16 * scaleFactor)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add participants to begin', cx, cy - 30);
      ctx.restore();
    } else {
      participants.forEach((p, idx) => {
        const startAngle = idx * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Draw slice wedge
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius - 2, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = p.color;
        ctx.fill();

        // Subtle inner slice border
        ctx.lineWidth = count > 50 ? 0.75 : 1.2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.stroke();
        ctx.restore();

        const assignedNum = p.assignedNumber ?? (idx + 1);
        const numDisplay = count > 30 ? String(assignedNum) : `#${assignedNum}`;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + sliceAngle / 2);

        // 1. High-Visibility Number Pocket at the TOP (outer perimeter of slice)
        const badgeDist = radius - (count > 50 ? Math.round(13 * scaleFactor) : Math.round(17 * scaleFactor));
        let badgeW = 28 * scaleFactor;
        let badgeH = 18 * scaleFactor;
        let numFontSize = 11.5 * scaleFactor;

        if (count > 60) {
          badgeW = 12 * scaleFactor;
          badgeH = 15 * scaleFactor;
          numFontSize = 8 * scaleFactor;
        } else if (count > 40) {
          badgeW = 16 * scaleFactor;
          badgeH = 16 * scaleFactor;
          numFontSize = 9.5 * scaleFactor;
        } else if (count > 25) {
          badgeW = 22 * scaleFactor;
          badgeH = 17 * scaleFactor;
          numFontSize = 10.5 * scaleFactor;
        }

        // Draw the bright white badge pocket at the top of the slice
        ctx.save();
        ctx.translate(badgeDist, 0);

        ctx.beginPath();
        const cr = Math.min(badgeW, badgeH) / 2;
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, cr);
        } else {
          ctx.arc(0, 0, cr, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 3;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Render the NUMBER in solid black
        ctx.fillStyle = '#000000';
        ctx.font = `900 ${Math.round(numFontSize)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numDisplay, 0, 0.5);
        ctx.restore();

        // 2. Render Participant Name below the top number inwards along the ray
        if (settings.showNamesOnWheel) {
          let nameFontSize = 13 * scaleFactor;
          if (count > 60) nameFontSize = 7.5 * scaleFactor;
          else if (count > 40) nameFontSize = 9 * scaleFactor;
          else if (count > 25) nameFontSize = 10.5 * scaleFactor;
          else if (count > 15) nameFontSize = 12 * scaleFactor;

          ctx.font = `700 ${Math.round(nameFontSize)}px Outfit, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillStyle = '#FFFFFF';

          const nameEndX = badgeDist - badgeW / 2 - (count > 50 ? 3 : 6);
          const maxNameWidth = nameEndX - (hubRadius + 8);

          let displayName = p.name;
          if (ctx.measureText(displayName).width > maxNameWidth) {
            let namePart = p.name;
            while (namePart.length > 1 && ctx.measureText(`${namePart}…`).width > maxNameWidth) {
              namePart = namePart.slice(0, -1);
            }
            displayName = `${namePart}…`;
          }

          if (maxNameWidth > 12) {
            ctx.strokeText(displayName, nameEndX, 0);
            ctx.fillText(displayName, nameEndX, 0);
          }
        }

        ctx.restore();
      });
    }

    // Outer Rim Decorative Golden Studs / Rivets
    const rivetCount = Math.min(Math.max(count, 12), 48);
    for (let r = 0; r < rivetCount; r++) {
      const rivetAngle = (r * 2 * Math.PI) / rivetCount;
      const rx = cx + (radius + 4) * Math.cos(rivetAngle);
      const ry = cy + (radius + 4) * Math.sin(rivetAngle);

      ctx.save();
      ctx.beginPath();
      ctx.arc(rx, ry, count > 40 ? 1.8 : 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FEF08A';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }

    // Outer bezel disc of the center hub (baked into the wheel disc)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 6, 0, 2 * Math.PI);
    const hubBezel = ctx.createLinearGradient(cx - hubRadius, cy - hubRadius, cx + hubRadius, cy + hubRadius);
    hubBezel.addColorStop(0, '#F59E0B');
    hubBezel.addColorStop(0.5, '#78350F');
    hubBezel.addColorStop(1, '#FDE68A');
    ctx.fillStyle = hubBezel;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    ctx.restore();
    isCacheValidRef.current = true;
  }, [participants, settings.showNamesOnWheel, size]);

  // Fast drawWheel: rotates and blits the cached wheel onto the visible canvas
  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = size;
      const height = size;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        isCacheValidRef.current = false;
      }

      if (!isCacheValidRef.current || !offscreenCanvasRef.current) {
        updateOffscreenWheel();
      }

      const offCanvas = offscreenCanvasRef.current;
      if (!offCanvas) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = (width * dpr) / 2;
      const cy = (height * dpr) / 2;

      // Ultra-fast GPU hardware-accelerated rotation blit
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.drawImage(offCanvas, -cx, -cy);
      ctx.restore();

      ctx.restore();
    },
    [size, updateOffscreenWheel]
  );

  // Redraw and invalidate cache whenever participants, settings, or dimensions change
  useEffect(() => {
    isCacheValidRef.current = false;
    drawWheel(rotationRef.current);
  }, [drawWheel, participants, settings, size]);

  // Smooth Casino Physics Easing Function
  // Phase 1 (0 -> tAcc): Smooth quadratic-sine ease-in from rest (zero initial jerk)
  // Phase 2 (tAcc -> 1): Authentic air/magnetic decay (continuous derivative, gradual slow-down, gentle landing)
  const calculateSmoothEasing = (t: number): number => {
    const tAcc = 0.12; // 12% time accelerating to top speed
    const p = 3.5;     // Power of deceleration decay
    const tDec = 1 - tAcc;

    const iAccTotal = tAcc / 2;
    const iDecTotal = tDec / (p + 1);
    const iTotal = iAccTotal + iDecTotal;

    if (t <= tAcc) {
      const iAcc = (t / 2) - (tAcc / (2 * Math.PI)) * Math.sin((Math.PI * t) / tAcc);
      return iAcc / iTotal;
    } else {
      const u = (t - tAcc) / tDec;
      const iDec = iDecTotal * (1 - Math.pow(1 - u, p + 1));
      return (iAccTotal + iDec) / iTotal;
    }
  };

  // Execute Spin Physics Animation
  useEffect(() => {
    if (wheelState !== 'spinning' || targetWinnerIndex === null || participants.length < 2) {
      return;
    }

    const count = participants.length;
    const sliceAngle = (2 * Math.PI) / count;

    // Top pointer is at 12 o'clock (-Math.PI / 2)
    const targetSliceCenter = (targetWinnerIndex + 0.5) * sliceAngle;

    // Natural slight jitter inside the winning slice (within ±25% of slice width)
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.5);
    const targetSliceOffset = targetSliceCenter + jitter;

    // Current angle normalized
    const startAngle = rotationRef.current;

    // Minimum full spins: settings.rotations (e.g. 7-10 turns)
    const baseRotations = Math.max(settings.rotations || 8, 6);
    const fullSpins = baseRotations * 2 * Math.PI;

    const idealFinalRaw = -Math.PI / 2 - targetSliceOffset;
    const turnsNeeded = Math.ceil((startAngle + fullSpins - idealFinalRaw) / (2 * Math.PI));
    const targetAngle = idealFinalRaw + turnsNeeded * 2 * Math.PI;

    const totalAngleDelta = targetAngle - startAngle;
    const durationMs = (settings.spinDuration || 5.2) * 1000;
    const startTime = performance.now();

    soundManager.playWoosh();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = calculateSmoothEasing(progress);

      const currentRotation = startAngle + totalAngleDelta * easedProgress;
      rotationRef.current = currentRotation;

      drawWheel(currentRotation);

      // Flapper peg collision / tick detection
      const pointerNormalizedAngle = ((-Math.PI / 2 - currentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSliceUnderPointer = Math.floor(pointerNormalizedAngle / sliceAngle) % count;

      if (currentSliceUnderPointer !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSliceUnderPointer;
        const remainingFraction = 1 - progress;
        const nowMs = performance.now();

        // Audio tick with rate-limiting to prevent audio buffer glitching at high speed
        if (nowMs - lastSoundTimeRef.current > 30) {
          lastSoundTimeRef.current = nowMs;
          const tickPitch = Math.min(1.4, Math.max(0.75, 0.7 + remainingFraction * 0.7));
          soundManager.playTick(tickPitch);
        }

        // Realistic flapper deflection velocity based on speed
        flapperSpringRef.current.velocity -= Math.min(14 * Math.max(remainingFraction, 0.15), 18);
      }

      // Update pointer spring physics directly on DOM element (zero React re-render overhead!)
      const springK = 0.35;
      const damping = 0.70;
      flapperSpringRef.current.velocity += (-flapperSpringRef.current.angle * springK);
      flapperSpringRef.current.velocity *= damping;
      flapperSpringRef.current.angle += flapperSpringRef.current.velocity;

      if (Math.abs(flapperSpringRef.current.angle) < 0.04 && Math.abs(flapperSpringRef.current.velocity) < 0.04) {
        flapperSpringRef.current.angle = 0;
        flapperSpringRef.current.velocity = 0;
      }

      if (flapperRef.current) {
        flapperRef.current.style.transform = `translateX(-50%) rotate(${flapperSpringRef.current.angle.toFixed(2)}deg)`;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished smoothly!
        rotationRef.current = targetAngle;
        drawWheel(targetAngle);
        flapperSpringRef.current.angle = 0;
        flapperSpringRef.current.velocity = 0;
        if (flapperRef.current) {
          flapperRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
        }

        // Small pause for dramatic effect before showing winner modal
        setTimeout(() => {
          const winner = participants[targetWinnerIndex];
          if (winner) {
            onSpinComplete(winner);
          }
        }, 350);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [wheelState, targetWinnerIndex, participants, settings, drawWheel, onSpinComplete]);

  // Spin is active even after a winner has been selected (as long as it's not currently spinning or counting down)
  const canSpin =
    participants.length >= 2 &&
    wheelState !== 'spinning' &&
    wheelState !== 'countdown';

  return (
    <div
      ref={containerRef}
      id="roulette-wheel-container"
      className="flex flex-col items-center justify-center h-full w-full mx-auto select-none px-2 pt-4 sm:pt-5 pb-1 min-h-0 relative gap-1"
    >
      {/* Wheel Canvas Container with Elegant Dark borders & glowing halo */}
      <div className="relative rounded-full border-[8px] sm:border-[10px] border-[#18181b] shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center p-1 sm:p-1.5 bg-[#09090b] group shrink-0">
        {/* Top Pointer Indicator - High Visibility Casino Arrow Needle Visible In All Views & Fullscreen */}
        <div
          ref={flapperRef}
          id="wheel-pointer-assembly"
          className="absolute z-50 -top-3 sm:-top-4 md:-top-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
          style={{
            transform: 'translateX(-50%) rotate(0deg)',
            transformOrigin: 'top center',
          }}
        >
          {/* Gold Metallic Mounting Base */}
          <div className="w-8 h-3.5 sm:w-10 sm:h-4.5 rounded-t-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-amber-950 border border-amber-200 shadow-inner" />
          </div>

          {/* High Visibility 3D Arrow Needle pointing directly down into the slice */}
          <div className="relative flex flex-col items-center -mt-0.5">
            <svg
              className="w-9 h-12 sm:w-11 sm:h-14 md:w-13 md:h-16 overflow-visible"
              viewBox="0 0 40 54"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="45%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#991B1B" />
                </linearGradient>
                <linearGradient id="arrowBorder" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>

              {/* Arrow 3D Body */}
              <path
                d="M 5 0 L 35 0 L 35 18 L 20 52 L 5 18 Z"
                fill="url(#arrowGrad)"
                stroke="url(#arrowBorder)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* 3D Highlight Ridge */}
              <path
                d="M 10 3 L 20 3 L 20 46 L 10 17 Z"
                fill="rgba(255, 255, 255, 0.4)"
              />

              {/* Center golden pivot jewel */}
              <circle cx="20" cy="11" r="4" fill="#FEF08A" stroke="#B45309" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 blur-sm pointer-events-none" />

        <canvas
          ref={canvasRef}
          id="roulette-wheel-canvas"
          onClick={canSpin ? onSpinStart : undefined}
          className={`block rounded-full relative z-10 transition-transform ${
            canSpin ? 'cursor-pointer hover:brightness-105 active:scale-[0.995]' : 'cursor-default'
          }`}
          style={{ width: size, height: size }}
          title={canSpin ? 'Click the wheel or center hub to spin!' : undefined}
        />

        {/* Interactive Center Spin Hub Button */}
        <button
          id="wheel-center-spin-button"
          type="button"
          onClick={onSpinStart}
          disabled={!canSpin}
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full
            flex flex-col items-center justify-center transition-all duration-150 select-none
            ${
              canSpin
                ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                : 'cursor-not-allowed opacity-95'
            }
          `}
          style={{
            width: Math.max(Math.round(size * 0.17), 70),
            height: Math.max(Math.round(size * 0.17), 70),
          }}
          title={canSpin ? 'Click to Spin the Wheel!' : wheelState === 'spinning' ? 'Wheel is spinning' : 'Add at least 2 participants'}
        >
          <div className="w-full h-full rounded-full border-2 border-amber-300/90 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 flex flex-col items-center justify-center text-black font-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_6px_16px_rgba(0,0,0,0.85)]">
            {wheelState === 'spinning' ? (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black animate-spin" />
            ) : wheelState === 'countdown' ? (
              <span className="text-[10px] font-mono font-black text-black">READY</span>
            ) : (
              <>
                <span className="text-[12px] sm:text-sm font-black tracking-wider uppercase text-black leading-none drop-shadow-xs">
                  {targetWinnerIndex !== null ? 'AGAIN' : 'SPIN'}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-amber-950 uppercase leading-none mt-0.5">
                  {targetWinnerIndex !== null ? 'SPIN' : 'HERE'}
                </span>
              </>
            )}
          </div>
        </button>

        {/* Countdown Overlay during pre-spin */}
        {wheelState === 'countdown' && (
          <div
            id="countdown-overlay"
            className="absolute inset-0 rounded-full bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-pulse"
          >
            <div className="p-4 rounded-2xl bg-[#18181b]/90 border border-amber-500/40 text-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <Sparkles className="w-7 h-7 text-amber-400 mx-auto mb-1.5 animate-bounce" />
              <div className="text-lg md:text-xl font-black text-white tracking-wide">
                GOOD LUCK EVERYONE!
              </div>
              <div className="text-[11px] text-amber-400 mt-1 uppercase font-bold tracking-widest">
                Spinning in 3... 2... 1...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wheel Status & Helper Indicator (Bottom spin button removed to maximize wheel size) */}
      <div id="wheel-controls-panel" className="mt-1 flex flex-col items-center w-full max-w-[360px] px-2 shrink-0 z-20">
        {/* Pre-spin status bar */}
        <div
          id="pre-spin-status"
          className="flex flex-wrap items-center justify-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-wider text-slate-400"
        >
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wheelState === 'spinning'
                  ? 'bg-amber-400 animate-ping'
                  : canSpin
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-200">
              {wheelState === 'spinning'
                ? 'SPINNING...'
                : wheelState === 'countdown'
                ? 'STARTING...'
                : canSpin
                ? 'CLICK CENTER TO SPIN'
                : 'ADD PARTICIPANTS'}
            </span>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            <strong className="text-amber-400">{participants.length}</strong> On Wheel
          </span>
          <span className="text-slate-600">•</span>
          <span>
            <strong className="text-emerald-400">{Math.max(100 - participants.length, 0)}</strong> Available
          </span>
          {targetWinnerIndex !== null && participants[targetWinnerIndex] && (
            <>
              <span className="text-slate-600">•</span>
              <span
                className="text-amber-400 font-bold truncate max-w-[110px]"
                title={`#${participants[targetWinnerIndex].assignedNumber ?? (targetWinnerIndex + 1)} ${participants[targetWinnerIndex].name}`}
              >
                🏆 #{participants[targetWinnerIndex].assignedNumber ?? (targetWinnerIndex + 1)}
              </span>
            </>
          )}
        </div>

        {/* Informative helper hint */}
        {participants.length < 2 && (
          <p id="spin-requirement-hint" className="text-xs text-rose-400 mt-1 font-medium text-center">
            {participants.length === 0
              ? 'Please add at least 2 participants before spinning.'
              : 'Please add at least one more participant.'}
          </p>
        )}
      </div>
    </div>
  );
};
