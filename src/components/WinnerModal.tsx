import React, { useEffect } from 'react';
import { Participant, WheelSettings, BetResult } from '../types';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, RotateCw, UserMinus, X, CheckCircle2 } from 'lucide-react';

interface WinnerModalProps {
  winner: Participant;
  settings: WheelSettings;
  betResult: BetResult | null;
  remainingAvailableCount?: number;
  onClose: () => void;
  onSpinAgain: () => void;
  onRemoveWinnerAndSpin: () => void;
  onRemoveWinnerOnly: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  settings,
  betResult,
  remainingAvailableCount,
  onClose,
  onSpinAgain,
  onRemoveWinnerAndSpin,
  onRemoveWinnerOnly,
}) => {
  useEffect(() => {
    // Play celebratory victory fanfare
    soundManager.playVictoryFanfare();

    // Trigger confetti bursts if enabled
    if (settings.confettiEnabled) {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }

    // Fireworks effect if enabled
    let fireworkInterval: NodeJS.Timeout | null = null;
    if (settings.fireworksEnabled) {
      const end = Date.now() + 2500;
      fireworkInterval = setInterval(() => {
        if (Date.now() > end) {
          if (fireworkInterval) clearInterval(fireworkInterval);
          return;
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random() * 0.8 + 0.1,
            y: Math.random() * 0.5 + 0.1,
          },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
          zIndex: 9999,
        });
      }, 350);
    }

    return () => {
      if (fireworkInterval) clearInterval(fireworkInterval);
    };
  }, [settings.confettiEnabled, settings.fireworksEnabled]);

  return (
    <div
      id="winner-announcement-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#18181b] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] text-center overflow-hidden">
        {/* Top ambient highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-amber-500/10 blur-2xl pointer-events-none" />

        {/* Close icon button */}
        <button
          id="close-winner-modal-icon"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trophy icon */}
        <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-amber-500/10 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
        </div>

        {/* Heading */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-widest uppercase mb-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          OFFICIAL WINNER
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>

        {/* Winner Name in Large Golden Typography */}
        <div
          id="winner-name-display"
          className="my-3 py-3 px-6 rounded-xl bg-black/40 border border-white/10 shadow-inner flex flex-col items-center justify-center gap-1"
        >
          {winner.assignedNumber !== undefined && (
            <span className="text-sm font-mono font-black text-amber-400 bg-amber-500/15 px-3 py-0.5 rounded-full border border-amber-500/30 tracking-wider">
              #{winner.assignedNumber}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-black text-amber-400 tracking-wide break-words drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            {winner.name}
          </h1>
        </div>

        <p className="text-slate-400 text-xs md:text-sm font-medium mb-2.5">
          Randomly selected by cryptographic spin
        </p>

        {/* Selected Number & Available Remaining Numbers Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono mb-4 text-slate-300">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
            <span>Selected:</span>
            <strong className="text-amber-400 font-bold">
              #{winner.assignedNumber ?? 'N/A'}
            </strong>
          </span>
          {remainingAvailableCount !== undefined && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Available Left:</span>
              <strong className="font-bold">{remainingAvailableCount}</strong>
            </span>
          )}
        </div>

        {/* Virtual Bet Result if wager was placed */}
        {betResult && (
          <div
            id="modal-bet-outcome-banner"
            className={`mb-5 p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 ${
              betResult.won
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            {betResult.won ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Your virtual bet on <strong>{betResult.participantName}</strong> won! +
                  <strong className="text-emerald-300">{betResult.payout} Credits</strong>
                </span>
              </>
            ) : (
              <span>
                Virtual wager on {betResult.participantName} (-{betResult.betAmount} pts).
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            id="modal-spin-again-button"
            onClick={onSpinAgain}
            className="w-full py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Spin Again</span>
          </button>

          <button
            id="modal-remove-winner-spin-again-button"
            onClick={onRemoveWinnerAndSpin}
            className="w-full py-2.5 px-6 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>Remove Winner & Spin Again</span>
          </button>

          <div className="flex gap-2 pt-1">
            <button
              id="modal-remove-winner-only-button"
              onClick={onRemoveWinnerOnly}
              className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
            >
              Remove Winner
            </button>
            <button
              id="modal-close-button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
