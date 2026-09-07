import React, { useState } from 'react';
import { Participant, WheelSettings, VirtualBet, BetResult } from '../types';
import { Coins, CheckCircle2, XCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface BettingPanelProps {
  participants: Participant[];
  settings: WheelSettings;
  virtualCredits: number;
  activeBet: VirtualBet | null;
  lastBetResult: BetResult | null;
  onPlaceBet: (bet: VirtualBet) => void;
  onClearBet: () => void;
  isLocked: boolean;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  participants,
  settings,
  virtualCredits,
  activeBet,
  lastBetResult,
  onPlaceBet,
  onClearBet,
  isLocked,
}) => {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    participants[0]?.id || ''
  );
  const [betAmount, setBetAmount] = useState<number>(settings.minBet || 10);

  if (!settings.virtualBettingEnabled) {
    return null;
  }

  const effectiveSelectedId =
    participants.some((p) => p.id === selectedParticipantId)
      ? selectedParticipantId
      : participants[0]?.id || '';

  const selectedParticipant = participants.find((p) => p.id === effectiveSelectedId);

  // Dynamic odds payout: based on participant count (e.g. 1 in N gives N-times payout, or min 2x)
  const oddsMultiplier = Math.max(participants.length, 2);
  const potentialWinnings = betAmount * oddsMultiplier;

  const handlePlace = () => {
    if (!selectedParticipant || betAmount <= 0 || betAmount > virtualCredits || isLocked) return;

    soundManager.playChipSound();
    onPlaceBet({
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      participantNumber: selectedParticipant.assignedNumber,
      amount: betAmount,
    });
  };

  const setPreset = (amount: number) => {
    if (isLocked) return;
    const clamped = Math.min(Math.max(amount, settings.minBet), Math.min(virtualCredits, settings.maxBet));
    setBetAmount(clamped);
  };

  return (
    <div
      id="virtual-betting-panel"
      className="bg-[#18181b]/90 border border-amber-500/20 rounded-xl p-3 sm:p-4 shadow-2xl flex flex-col h-full min-h-0 backdrop-blur-md relative overflow-y-auto"
    >
      {/* Subtle ambient amber accent */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Header with Balance */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
        <div>
          <h3 className="text-xs font-bold uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Place Virtual Bet
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Entertainment Only • No Real Money
          </p>
        </div>

        {/* Current Balance Pill */}
        <div
          id="virtual-credit-balance"
          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5"
        >
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Balance:</span>
          <span className="font-mono font-bold text-amber-500 text-xs">
            {virtualCredits}
          </span>
        </div>
      </div>

      {/* Bet Form Controls */}
      <div className="mt-3 space-y-2.5 shrink-0">
        {/* Select Participant Dropdown & Amount Input row */}
        <div className="flex gap-2">
          <select
            id="bet-participant-select"
            value={effectiveSelectedId}
            onChange={(e) => setSelectedParticipantId(e.target.value)}
            disabled={isLocked || !!activeBet || participants.length === 0}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500/50 disabled:opacity-40"
          >
            {participants.length === 0 && <option>Add participants first</option>}
            {participants.map((p, idx) => (
              <option key={p.id} value={p.id} className="bg-[#18181b] text-white">
                #{p.assignedNumber ?? (idx + 1)} {p.name}
              </option>
            ))}
          </select>

          <input
            id="bet-amount-input"
            type="number"
            min={settings.minBet}
            max={Math.min(virtualCredits, settings.maxBet)}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={isLocked || !!activeBet}
            placeholder="Amount"
            className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-center text-white focus:outline-none focus:border-amber-500/50 disabled:opacity-40 font-mono font-bold"
          />
        </div>

        {/* Quick chip presets */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {[10, 25, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setPreset(amt)}
                disabled={isLocked || !!activeBet || virtualCredits < amt}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold rounded border border-white/10 cursor-pointer disabled:opacity-30 transition-colors"
              >
                +{amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset(Math.min(virtualCredits, settings.maxBet))}
              disabled={isLocked || !!activeBet || virtualCredits <= 0}
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[10px] font-bold rounded border border-amber-500/30 cursor-pointer disabled:opacity-30 transition-colors"
            >
              MAX
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            Multiplier: <strong className="text-amber-500">{oddsMultiplier}x</strong>
          </span>
        </div>

        {/* Potential Return Note */}
        <div className="p-2 rounded bg-black/30 border border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Potential Return:</span>
          <span className="text-emerald-400 font-bold font-mono">
            +{potentialWinnings} pts
          </span>
        </div>

        {/* Place or Cancel Bet Button */}
        {activeBet ? (
          <div className="flex items-center justify-between p-2.5 rounded bg-amber-500/10 border border-amber-500/30">
            <div className="text-xs">
              <span className="text-slate-400">Bet: </span>
              <strong className="text-white">{activeBet.amount} pts</strong> on{' '}
              <strong className="text-amber-400">
                {activeBet.participantNumber ? `#${activeBet.participantNumber} ` : ''}
                {activeBet.participantName}
              </strong>
            </div>
            <button
              id="cancel-active-bet-button"
              onClick={onClearBet}
              disabled={isLocked}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-rose-300 text-[10px] uppercase font-bold rounded border border-white/10 cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            id="place-virtual-bet-button"
            onClick={handlePlace}
            disabled={
              isLocked ||
              participants.length === 0 ||
              betAmount <= 0 ||
              betAmount > virtualCredits
            }
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Place Virtual Bet</span>
          </button>
        )}
      </div>

      {/* Recent Outcome notification badge if available */}
      {lastBetResult && (
        <div
          id="last-bet-result-card"
          className={`mt-2.5 p-2 rounded-lg border text-xs flex items-center justify-between ${
            lastBetResult.won
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {lastBetResult.won ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span className="text-[11px]">
              {lastBetResult.won ? (
                <>Won on <strong>{lastBetResult.participantName}</strong></>
              ) : (
                <>Bet on <strong>{lastBetResult.participantName}</strong> lost</>
              )}
            </span>
          </div>
          <span className="font-bold font-mono text-[11px]">
            {lastBetResult.won ? `+${lastBetResult.payout} pts` : `-${lastBetResult.betAmount} pts`}
          </span>
        </div>
      )}
    </div>
  );
};
