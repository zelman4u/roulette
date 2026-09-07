/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useId } from 'react';
import {
  Participant,
  WheelSettings,
  WheelState,
  VirtualBet,
  BetResult,
  SpinHistoryItem,
} from './types';
import { RouletteWheel } from './components/RouletteWheel';
import { ParticipantManager } from './components/ParticipantManager';
import { BettingPanel } from './components/BettingPanel';
import { WinnerHistory } from './components/WinnerHistory';
import { AvailableNumbersBoard } from './components/AvailableNumbersBoard';
import { WinnerModal } from './components/WinnerModal';
import { SettingsModal } from './components/SettingsModal';
import { FairnessModal } from './components/FairnessModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { assignColors } from './utils/colors';
import { pickSecureRandomWinner } from './utils/random';
import { soundManager } from './utils/audio';
import { SAMPLE_NAMES_12 } from './utils/sampleData';
import {
  Volume2,
  VolumeX,
  Settings,
  ShieldCheck,
  RotateCcw,
  Users,
  Coins,
  History,
  Sparkles,
  HelpCircle,
  Hash,
  Maximize2,
  Minimize2,
  Monitor,
  Expand,
  Shrink,
} from 'lucide-react';

const STORAGE_KEY = 'ROULETTE_APP_DATA_V1';

const DEFAULT_SETTINGS: WheelSettings = {
  spinDuration: 5,
  rotations: 8,
  soundEnabled: true,
  confettiEnabled: true,
  fireworksEnabled: true,
  autoRemoveWinner: false,
  showNamesOnWheel: true,
  virtualBettingEnabled: true,
  startingCredits: 100,
  minBet: 5,
  maxBet: 500,
};

export default function App() {
  // Session State
  const [participants, setParticipants] = useState<Participant[]>(() => {
    // Initial sample participants
    const colors = assignColors(SAMPLE_NAMES_12.length);
    return SAMPLE_NAMES_12.map((name, i) => ({
      id: `p-${i}-${Date.now()}`,
      name,
      assignedNumber: i + 1,
      color: colors[i],
      credits: 100,
    }));
  });

  const [settings, setSettings] = useState<WheelSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);
  const [virtualCredits, setVirtualCredits] = useState<number>(100);
  const [activeBet, setActiveBet] = useState<VirtualBet | null>(null);
  const [lastBetResult, setLastBetResult] = useState<BetResult | null>(null);

  // Wheel State
  const [wheelState, setWheelState] = useState<WheelState>('idle');
  const [targetWinnerIndex, setTargetWinnerIndex] = useState<number | null>(null);
  const [currentWinner, setCurrentWinner] = useState<Participant | null>(null);
  const [currentSeed, setCurrentSeed] = useState<string>('');

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<'participants' | 'numbers' | 'betting' | 'history'>('participants');
  const [windowsView, setWindowsView] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [windowsDrawerTab, setWindowsDrawerTab] = useState<'participants' | 'numbers' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Fullscreen event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  // Compute how many numbers 1-100 are still available
  const availableNumbersCount = useMemo(() => {
    const assigned = new Set(
      participants
        .map((p) => p.assignedNumber)
        .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 100)
    );
    return Math.max(100 - assigned.size, 0);
  }, [participants]);

  // Restore from LocalStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.participants && Array.isArray(data.participants) && data.participants.length > 0) {
          const normalized = data.participants.map((p: any, idx: number) => ({
            ...p,
            assignedNumber: typeof p.assignedNumber === 'number' ? p.assignedNumber : idx + 1,
          }));
          setParticipants(normalized);
        }
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
          soundManager.setSoundEnabled(data.settings.soundEnabled ?? true);
        }
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
        }
        if (typeof data.virtualCredits === 'number') {
          setVirtualCredits(data.virtualCredits);
        }
      }
    } catch {
      // Ignore parse errors, fallback to default
    }
  }, []);

  // Save to LocalStorage on state change
  useEffect(() => {
    try {
      const payload = {
        participants,
        settings,
        history,
        virtualCredits,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable
    }
  }, [participants, settings, history, virtualCredits]);

  // Recalculate participant colors whenever list length or membership changes
  const syncColors = useCallback((list: Participant[]): Participant[] => {
    const colors = assignColors(list.length);
    return list.map((p, i) => ({
      ...p,
      color: colors[i] || p.color,
    }));
  }, []);

  // Participant Management Handlers
  const handleAddParticipant = (name: string, assignedNumber?: number): boolean => {
    if (participants.length >= 100 || !name.trim()) return false;

    let num = assignedNumber;
    if (num === undefined || isNaN(num) || num <= 0) {
      const used = new Set(participants.map((p) => p.assignedNumber || 0));
      let candidate = 1;
      while (used.has(candidate)) {
        candidate++;
      }
      num = candidate;
    }

    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      assignedNumber: num,
      color: '#3B82F6',
      credits: settings.startingCredits,
    };
    setParticipants((prev) => syncColors([...prev, newParticipant]));
    return true;
  };

  const handleBulkAdd = (
    items: (string | { name: string; assignedNumber?: number })[]
  ) => {
    const availableSlots = 100 - participants.length;
    if (availableSlots <= 0) return;

    const used = new Set(participants.map((p) => p.assignedNumber || 0));
    let candidate = 1;
    const getNextNum = () => {
      while (used.has(candidate)) {
        candidate++;
      }
      used.add(candidate);
      return candidate;
    };

    const toAdd: Participant[] = [];
    for (const item of items.slice(0, availableSlots)) {
      const name = typeof item === 'string' ? item.trim() : item.name.trim();
      const customNum = typeof item === 'string' ? undefined : item.assignedNumber;
      if (!name) continue;

      const assigned =
        customNum && customNum > 0 ? (used.add(customNum), customNum) : getNextNum();

      toAdd.push({
        id: `p-${Date.now()}-${toAdd.length}-${Math.random().toString(36).slice(2, 5)}`,
        name,
        assignedNumber: assigned,
        color: '#3B82F6',
        credits: settings.startingCredits,
      });
    }

    setParticipants((prev) => syncColors([...prev, ...toAdd]));
  };

  const handleUpdateParticipant = (id: string, newName: string, newNumber?: number) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          name: newName.trim(),
          assignedNumber:
            typeof newNumber === 'number' && newNumber > 0 ? newNumber : p.assignedNumber,
        };
      })
    );
  };

  const handleAutoNumber = () => {
    setParticipants((prev) =>
      prev.map((p, idx) => ({
        ...p,
        assignedNumber: idx + 1,
      }))
    );
  };

  const handleSortByNumber = () => {
    setParticipants((prev) =>
      syncColors([...prev].sort((a, b) => (a.assignedNumber || 0) - (b.assignedNumber || 0)))
    );
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => syncColors(prev.filter((p) => p.id !== id)));
    if (activeBet && activeBet.participantId === id) {
      setActiveBet(null);
    }
  };

  const handleClearAll = () => {
    setParticipants([]);
    setActiveBet(null);
  };

  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const deduplicated: Participant[] = [];

    participants.forEach((p) => {
      const norm = p.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        deduplicated.push(p);
      }
    });

    setParticipants(syncColors(deduplicated));
  };

  // Sound Toggle in Top Bar
  const handleToggleSound = () => {
    const nextVal = !settings.soundEnabled;
    soundManager.setSoundEnabled(nextVal);
    setSettings((prev) => ({ ...prev, soundEnabled: nextVal }));
  };

  // Start Spin Process - allows re-spinning even after winner is selected
  const handleSpinStart = () => {
    if (wheelState === 'spinning' || wheelState === 'countdown' || participants.length < 2) return;

    // Dismiss winner modal if still open
    setShowWinnerModal(false);

    let pool = participants;
    // If autoRemoveWinner was enabled and we had a winner:
    if (settings.autoRemoveWinner && currentWinner) {
      pool = syncColors(participants.filter((p) => p.id !== currentWinner.id));
      setParticipants(pool);
      if (pool.length < 2) {
        setWheelState('idle');
        setTargetWinnerIndex(null);
        setCurrentWinner(null);
        return;
      }
    }

    // Pick genuinely secure random winner
    const { selectedIndex, seed } = pickSecureRandomWinner(pool.length);
    setTargetWinnerIndex(selectedIndex);
    setCurrentSeed(seed);

    // Enter countdown pre-spin state
    setWheelState('countdown');
    soundManager.playCountdownPip(false);

    setTimeout(() => {
      soundManager.playCountdownPip(true);
      setWheelState('spinning');
    }, 650);
  };

  // Spin Complete Handler
  const handleSpinComplete = (winner: Participant) => {
    setWheelState('celebrating');
    setCurrentWinner(winner);

    // Resolve Virtual Bet if placed
    let betRes: BetResult | null = null;
    if (activeBet && settings.virtualBettingEnabled) {
      const won = activeBet.participantId === winner.id;
      const multiplier = Math.max(participants.length, 2);
      const payout = won ? activeBet.amount * multiplier : 0;
      const netGain = won ? payout - activeBet.amount : -activeBet.amount;

      betRes = {
        won,
        participantName: activeBet.participantName,
        participantNumber: activeBet.participantNumber,
        betAmount: activeBet.amount,
        payout,
        netGain,
        timestamp: Date.now(),
      };

      setLastBetResult(betRes);
      setVirtualCredits((prev) => Math.max(0, prev + netGain));
      setActiveBet(null);
    }

    // Format current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Save to Winner History
    const historyItem: SpinHistoryItem = {
      id: `spin-${Date.now()}`,
      winnerId: winner.id,
      winnerName: winner.name,
      winnerNumber: winner.assignedNumber,
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      totalParticipants: participants.length,
      betResult: betRes,
      seedVerification: currentSeed,
    };

    setHistory((prev) => [historyItem, ...prev]);
    setShowWinnerModal(true);
  };

  // Winner Modal Action: Spin Again immediately
  const handleModalSpinAgain = () => {
    setShowWinnerModal(false);
    let pool = participants;
    if (settings.autoRemoveWinner && currentWinner) {
      pool = syncColors(participants.filter((p) => p.id !== currentWinner.id));
      setParticipants(pool);
    }
    setWheelState('idle');
    setTargetWinnerIndex(null);
    setCurrentWinner(null);

    if (pool.length >= 2) {
      setTimeout(() => {
        const { selectedIndex, seed } = pickSecureRandomWinner(pool.length);
        setTargetWinnerIndex(selectedIndex);
        setCurrentSeed(seed);
        setWheelState('countdown');
        soundManager.playCountdownPip(false);
        setTimeout(() => {
          soundManager.playCountdownPip(true);
          setWheelState('spinning');
        }, 650);
      }, 150);
    }
  };

  // Winner Modal Action: Remove Winner and Spin Again
  const handleModalRemoveWinnerAndSpin = () => {
    if (!currentWinner) return;
    const remaining = participants.filter((p) => p.id !== currentWinner.id);
    const updated = syncColors(remaining);
    setParticipants(updated);
    setShowWinnerModal(false);
    setCurrentWinner(null);
    setWheelState('idle');
    setTargetWinnerIndex(null);

    if (updated.length >= 2) {
      setTimeout(() => {
        // Trigger next spin
        const { selectedIndex, seed } = pickSecureRandomWinner(updated.length);
        setTargetWinnerIndex(selectedIndex);
        setCurrentSeed(seed);
        setWheelState('countdown');
        soundManager.playCountdownPip(false);
        setTimeout(() => {
          soundManager.playCountdownPip(true);
          setWheelState('spinning');
        }, 650);
      }, 200);
    }
  };

  // Winner Modal Action: Remove Winner Only
  const handleModalRemoveWinnerOnly = () => {
    if (currentWinner) {
      setParticipants((prev) => syncColors(prev.filter((p) => p.id !== currentWinner.id)));
    }
    setShowWinnerModal(false);
    setWheelState('idle');
    setTargetWinnerIndex(null);
    setCurrentWinner(null);
  };

  // Reset Session
  const handleConfirmReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setParticipants([]);
    setHistory([]);
    setVirtualCredits(settings.startingCredits);
    setActiveBet(null);
    setLastBetResult(null);
    setWheelState('idle');
    setTargetWinnerIndex(null);
    setCurrentWinner(null);
    setShowResetConfirm(false);
  };

  const isLocked = wheelState === 'spinning' || wheelState === 'countdown';

  return (
    <div
      id="roulette-app"
      className="min-h-screen lg:h-screen lg:max-h-screen bg-[#09090b] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black overflow-y-auto lg:overflow-hidden"
    >
      {/* Top Navigation Bar */}
      <header
        id="app-header"
        className="shrink-0 bg-[#18181b]/80 backdrop-blur-md border-b border-white/10 px-3 py-2 sm:px-6"
      >
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0">
              RW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-wider uppercase text-white">
                  Roulette Wheel
                </h1>
                <span className="hidden sm:inline-block text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Raffle & Winner Picker
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                100 MAX PARTICIPANTS • CRYPTOGRAPHICALLY RANDOM
              </p>
            </div>
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Windows View Mode Toggle */}
            <button
              id="header-windows-view-button"
              onClick={() => setWindowsView(!windowsView)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                windowsView
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title={windowsView ? 'Exit Windows View' : 'Switch to Windows Full-Window View'}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase text-[10px] font-mono tracking-wider font-bold">
                {windowsView ? 'Exit Windows View' : 'Windows View'}
              </span>
            </button>

            {/* System Ready indicator */}
            <div className="hidden xl:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono tracking-wider text-slate-300">SYSTEM READY</span>
            </div>

            {/* Sound Toggle Button */}
            <button
              id="header-sound-toggle"
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-white/5 hover:bg-white/10 text-emerald-400 border-white/10'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
              }`}
              title={settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fairness Information Button */}
            <button
              id="header-fairness-button"
              onClick={() => setShowFairness(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="How Randomness & Fairness Works"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline uppercase text-[10px] font-mono tracking-wider">Fairness</span>
            </button>

            {/* Settings Modal Button */}
            <button
              id="header-settings-button"
              onClick={() => setShowSettings(true)}
              disabled={isLocked}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
              title="Wheel & Spin Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Reset Session Button */}
            <button
              id="header-reset-button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isLocked}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
              title="Reset Current Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase text-[10px] font-mono tracking-wider">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - spacious layout maximizing roulette presence */}
      <main className="flex-1 min-h-0 max-w-[1720px] w-full mx-auto p-2 sm:p-3.5 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch">
        {/* Left Column: Prominent Roulette Stage */}
        <section
          id="roulette-stage-section"
          className={`
            h-full flex flex-col items-center justify-center p-2 sm:p-3.5 rounded-xl bg-[#18181b]/60 border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300
            ${
              windowsView
                ? 'w-full min-h-[580px] sm:min-h-[660px] lg:min-h-[740px]'
                : 'w-full lg:w-[68%] xl:w-[72%] 2xl:w-[74%] min-h-[520px] sm:min-h-[600px] lg:min-h-[680px] shrink-0 lg:shrink'
            }
          `}
        >
          {/* Ambient subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Stage Bar: Mode Controls & Active Wager */}
          <div className="w-full flex items-center justify-between gap-2 px-1 mb-1 shrink-0 z-20">
            <div className="flex items-center gap-2">
              {activeBet && settings.virtualBettingEnabled ? (
                <div
                  id="stage-active-wager-pill"
                  className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-lg"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Active Bet: {activeBet.amount} pts on{' '}
                    <span className="underline">{activeBet.participantName}</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {windowsView ? 'WINDOWS STAGE VIEW' : 'CRYPTO ROULETTE'}
                  </span>
                </div>
              )}
            </div>

            {/* Stage Action Controls */}
            <div className="flex items-center gap-1.5">
              {/* If in Windows View, quick toggles for Numbers and Participants */}
              {windowsView && (
                <>
                  <button
                    id="windows-quick-numbers-btn"
                    type="button"
                    onClick={() => setWindowsDrawerTab(windowsDrawerTab === 'numbers' ? null : 'numbers')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                      windowsDrawerTab === 'numbers'
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                    title="Toggle Available Numbers Board (1-100)"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Numbers (1-100)</span>
                  </button>

                  <button
                    id="windows-quick-participants-btn"
                    type="button"
                    onClick={() => setWindowsDrawerTab(windowsDrawerTab === 'participants' ? null : 'participants')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                      windowsDrawerTab === 'participants'
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                    title="Toggle Participants Panel"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Participants ({participants.length})</span>
                  </button>
                </>
              )}

              {/* Native Fullscreen Button */}
              <button
                id="stage-fullscreen-button"
                type="button"
                onClick={toggleFullscreen}
                className="p-1 sm:px-2 sm:py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 border bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white transition-all cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'}
              >
                {isFullscreen ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>

              {/* Windows View Toggle Button */}
              <button
                id="stage-windows-toggle-button"
                type="button"
                onClick={() => setWindowsView(!windowsView)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                  windowsView
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
                }`}
                title={windowsView ? 'Exit Windows View' : 'Maximize to Windows View'}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="font-bold">{windowsView ? 'Exit Windows View' : 'Windows View'}</span>
              </button>
            </div>
          </div>

          {/* Quick Floating Drawer in Windows View */}
          {windowsView && windowsDrawerTab && (
            <div className="absolute top-12 right-2 bottom-2 w-full max-w-[420px] bg-[#18181b]/95 backdrop-blur-md rounded-xl border border-white/15 shadow-2xl z-40 flex flex-col p-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2 shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  {windowsDrawerTab === 'numbers' ? (
                    <>
                      <Hash className="w-4 h-4" /> Available Numbers Board (1-100)
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" /> Participants ({participants.length})
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setWindowsDrawerTab(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {windowsDrawerTab === 'numbers' ? (
                  <AvailableNumbersBoard
                    participants={participants}
                    history={history}
                    onAssignNumber={(name, assignedNumber) => handleAddParticipant(name, assignedNumber)}
                    onRemoveParticipant={handleRemoveParticipant}
                    isLocked={isLocked}
                  />
                ) : (
                  <ParticipantManager
                    participants={participants}
                    onAddParticipant={handleAddParticipant}
                    onBulkAdd={handleBulkAdd}
                    onUpdateParticipant={handleUpdateParticipant}
                    onRemoveParticipant={handleRemoveParticipant}
                    onClearAll={handleClearAll}
                    isLocked={isLocked}
                  />
                )}
              </div>
            </div>
          )}

          {/* The Canvas Roulette Wheel */}
          <RouletteWheel
            participants={participants}
            settings={settings}
            wheelState={wheelState}
            onSpinStart={handleSpinStart}
            onSpinComplete={handleSpinComplete}
            targetWinnerIndex={targetWinnerIndex}
          />
        </section>

        {/* Right Column: Organizer & Control Panels */}
        <section
          id="organizer-panel-section"
          className={`
            h-full flex flex-col gap-2 min-h-0 overflow-hidden transition-all duration-300
            ${
              windowsView
                ? 'hidden'
                : 'w-full lg:w-[32%] xl:w-[28%] 2xl:w-[26%] min-w-[310px]'
            }
          `}
        >
          {/* Mobile & Tablet Nav Tabs */}
          <div
            id="panel-navigation-tabs"
            className="flex items-center gap-1.5 p-1 bg-[#18181b]/90 rounded-xl border border-white/10 shrink-0 overflow-x-auto no-scrollbar"
          >
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'participants'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Participants ({participants.length})</span>
            </button>

            {/* Dedicated Available & Selected Numbers Tab */}
            <button
              id="tab-numbers-board"
              onClick={() => setActiveTab('numbers')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'numbers'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Track available numbers 1-100 in real time"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Numbers ({availableNumbersCount} Free)</span>
            </button>

            {settings.virtualBettingEnabled && (
              <button
                onClick={() => setActiveTab('betting')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'betting'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Betting ({virtualCredits})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({history.length})</span>
            </button>
          </div>

          {/* Tab Views - flex container fitting remaining height */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'participants' && (
              <ParticipantManager
                participants={participants}
                onAddParticipant={handleAddParticipant}
                onBulkAdd={handleBulkAdd}
                onUpdateParticipant={handleUpdateParticipant}
                onRemoveParticipant={handleRemoveParticipant}
                onClearAll={handleClearAll}
                onRemoveDuplicates={handleRemoveDuplicates}
                onAutoNumber={handleAutoNumber}
                onSortByNumber={handleSortByNumber}
                onViewNumbersBoard={() => setActiveTab('numbers')}
                isLocked={isLocked}
              />
            )}

            {activeTab === 'numbers' && (
              <AvailableNumbersBoard
                participants={participants}
                history={history}
                onAssignNumber={(name, assignedNumber) => handleAddParticipant(name, assignedNumber)}
                onRemoveParticipant={handleRemoveParticipant}
                isLocked={isLocked}
              />
            )}

            {activeTab === 'betting' && settings.virtualBettingEnabled && (
              <BettingPanel
                participants={participants}
                settings={settings}
                virtualCredits={virtualCredits}
                activeBet={activeBet}
                lastBetResult={lastBetResult}
                onPlaceBet={(bet) => setActiveBet(bet)}
                onClearBet={() => setActiveBet(null)}
                isLocked={isLocked}
              />
            )}

            {activeTab === 'history' && (
              <WinnerHistory
                history={history}
                autoRemoveWinner={settings.autoRemoveWinner}
                onToggleAutoRemove={(enabled) =>
                  setSettings((prev) => ({ ...prev, autoRemoveWinner: enabled }))
                }
                onClearHistory={() => setHistory([])}
                onRemoveWinnerFromParticipants={(id) => handleRemoveParticipant(id)}
              />
            )}
          </div>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="shrink-0 border-t border-white/10 py-1.5 px-4 sm:px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-1">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Verifiably Random Selection Engine</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <button
            onClick={() => setShowFairness(true)}
            className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>How It Works</span>
          </button>
          <span>•</span>
          <span>Max 100 Participants</span>
          <span>•</span>
          <span className="text-amber-500">Virtual Credits Only</span>
        </div>
      </footer>

      {/* Winner Announcement Celebration Modal */}
      {showWinnerModal && currentWinner && (
        <WinnerModal
          winner={currentWinner}
          settings={settings}
          betResult={lastBetResult}
          remainingAvailableCount={availableNumbersCount}
          onClose={() => {
            setShowWinnerModal(false);
            setWheelState('idle');
          }}
          onSpinAgain={handleModalSpinAgain}
          onRemoveWinnerAndSpin={handleModalRemoveWinnerAndSpin}
          onRemoveWinnerOnly={handleModalRemoveWinnerOnly}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Fairness & RNG Explanation Modal */}
      {showFairness && (
        <FairnessModal onClose={() => setShowFairness(false)} lastSeed={currentSeed} />
      )}

      {/* Reset Session Confirmation Modal */}
      <ResetConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirmReset={handleConfirmReset}
      />
    </div>
  );
}
