import React, { useState, useMemo } from 'react';
import { Participant, SpinHistoryItem } from '../types';
import {
  Hash,
  CheckCircle2,
  XCircle,
  Trophy,
  Search,
  Shuffle,
  Copy,
  Check,
  UserPlus,
  User,
  Filter,
  Sparkles,
} from 'lucide-react';

interface AvailableNumbersBoardProps {
  participants: Participant[];
  history: SpinHistoryItem[];
  onAssignNumber: (name: string, assignedNumber: number) => boolean;
  onRemoveParticipant?: (id: string) => void;
  isLocked: boolean;
}

export const AvailableNumbersBoard: React.FC<AvailableNumbersBoardProps> = ({
  participants,
  history,
  onAssignNumber,
  onRemoveParticipant,
  isLocked,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'selected' | 'won'>('all');
  const [searchNum, setSearchNum] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick Assign Modal / Dialog State
  const [assigningNumber, setAssigningNumber] = useState<number | null>(null);
  const [assigningName, setAssigningName] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Map assigned numbers to participants
  const assignedMap = useMemo(() => {
    const map = new Map<number, Participant>();
    participants.forEach((p) => {
      if (p.assignedNumber && p.assignedNumber >= 1 && p.assignedNumber <= 100) {
        map.set(p.assignedNumber, p);
      }
    });
    return map;
  }, [participants]);

  // Map winning numbers from history
  const wonNumbersMap = useMemo(() => {
    const map = new Map<number, SpinHistoryItem>();
    history.forEach((h) => {
      if (h.winnerNumber && h.winnerNumber >= 1 && h.winnerNumber <= 100) {
        if (!map.has(h.winnerNumber)) {
          map.set(h.winnerNumber, h);
        }
      }
    });
    return map;
  }, [history]);

  // Calculate stats
  const totalNumbers = 100;
  const selectedCount = assignedMap.size;
  const availableCount = Math.max(totalNumbers - selectedCount, 0);
  const wonCount = wonNumbersMap.size;

  // List of available numbers
  const availableNumbersList = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= 100; i++) {
      if (!assignedMap.has(i)) {
        list.push(i);
      }
    }
    return list;
  }, [assignedMap]);

  // First available number
  const nextAvailableNumber = availableNumbersList.length > 0 ? availableNumbersList[0] : null;

  // Filtered array of 1-100 numbers based on filter and search
  const displayedNumbers = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= 100; i++) {
      const isSelected = assignedMap.has(i);
      const isWon = wonNumbersMap.has(i);

      if (filterMode === 'available' && isSelected) continue;
      if (filterMode === 'selected' && !isSelected) continue;
      if (filterMode === 'won' && !isWon) continue;

      if (searchNum.trim()) {
        const query = searchNum.trim().replace(/^#/, '');
        const matchesNum = String(i).includes(query);
        const participant = assignedMap.get(i);
        const matchesName = participant?.name.toLowerCase().includes(query.toLowerCase()) ?? false;
        if (!matchesNum && !matchesName) continue;
      }

      list.push(i);
    }
    return list;
  }, [filterMode, searchNum, assignedMap, wonNumbersMap]);

  const handleCopyAvailable = () => {
    if (availableNumbersList.length === 0) return;
    const text = `Available Numbers (1-100):\n${availableNumbersList.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePickRandomFree = () => {
    if (availableNumbersList.length === 0) return;
    const rand = availableNumbersList[Math.floor(Math.random() * availableNumbersList.length)];
    setAssigningNumber(rand);
    setAssigningName('');
    setAssignError(null);
  };

  const handleStartAssign = (num: number) => {
    if (isLocked) return;
    if (assignedMap.has(num)) return;
    setAssigningNumber(num);
    setAssigningName('');
    setAssignError(null);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningNumber || !assigningName.trim() || isLocked) return;
    if (assignedMap.has(assigningNumber)) {
      setAssignError(`Number #${assigningNumber} is already taken!`);
      return;
    }

    const ok = onAssignNumber(assigningName.trim(), assigningNumber);
    if (ok) {
      setAssigningNumber(null);
      setAssigningName('');
      setAssignError(null);
    } else {
      setAssignError('Failed to assign number. Check participant limit.');
    }
  };

  return (
    <div
      id="available-numbers-board"
      className="flex flex-col h-full bg-[#18181b]/90 border border-white/10 rounded-2xl p-3 sm:p-4 overflow-hidden shadow-xl"
    >
      {/* Board Header & Key Stats */}
      <div className="shrink-0 flex flex-col gap-2.5 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Hash className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Numbers Status (1–100)
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Real-time tracking of selected vs available numbers
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePickRandomFree}
              disabled={isLocked || availableNumbersList.length === 0}
              className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
              title="Pick a random available number"
            >
              <Shuffle className="w-3 h-3" />
              <span className="hidden sm:inline">Pick Free</span>
            </button>

            <button
              onClick={handleCopyAvailable}
              disabled={availableNumbersList.length === 0}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Copy available numbers list"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Status Counters Bar */}
        <div className="grid grid-cols-3 gap-2">
          {/* Available Counter */}
          <div
            onClick={() => setFilterMode('available')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              filterMode === 'available'
                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Available
              </span>
              <span className="text-xs font-mono font-black text-emerald-300">
                {availableCount}
              </span>
            </div>
            <div className="text-[11px] text-emerald-200/70 font-mono mt-0.5 truncate">
              {nextAvailableNumber ? `Next: #${nextAvailableNumber}` : 'All Taken!'}
            </div>
          </div>

          {/* Selected / Taken Counter */}
          <div
            onClick={() => setFilterMode('selected')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              filterMode === 'selected'
                ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" />
                Selected
              </span>
              <span className="text-xs font-mono font-black text-amber-300">
                {selectedCount}/100
              </span>
            </div>
            <div className="text-[11px] text-amber-200/70 font-mono mt-0.5 truncate">
              {selectedCount > 0 ? `${selectedCount} assigned` : 'None assigned'}
            </div>
          </div>

          {/* Winners Drawn Counter */}
          <div
            onClick={() => setFilterMode('won')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              filterMode === 'won'
                ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-purple-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-purple-400" />
                Drawn
              </span>
              <span className="text-xs font-mono font-black text-purple-300">
                {wonCount}
              </span>
            </div>
            <div className="text-[11px] text-purple-200/70 font-mono mt-0.5 truncate">
              {wonCount > 0 ? `${wonCount} spun` : '0 drawn'}
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white/20 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (100)
            </button>
            <button
              onClick={() => setFilterMode('available')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                filterMode === 'available'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Free ({availableCount})
            </button>
            <button
              onClick={() => setFilterMode('selected')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                filterMode === 'selected'
                  ? 'bg-amber-500/30 text-amber-300'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Taken ({selectedCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search # or name..."
              value={searchNum}
              onChange={(e) => setSearchNum(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Quick Assign Dialog when clicking an available number */}
      {assigningNumber !== null && (
        <div className="shrink-0 my-2 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleConfirmAssign} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Assign Number #{assigningNumber}
              </span>
              <button
                type="button"
                onClick={() => setAssigningNumber(null)}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer px-1"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder={`Name for #${assigningNumber}...`}
                value={assigningName}
                onChange={(e) => setAssigningName(e.target.value)}
                maxLength={40}
                className="flex-1 bg-black/60 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!assigningName.trim() || isLocked}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg uppercase tracking-wider cursor-pointer disabled:opacity-40 transition-colors"
              >
                Assign
              </button>
            </div>
            {assignError && (
              <span className="text-[10px] text-rose-400 font-mono">{assignError}</span>
            )}
          </form>
        </div>
      )}

      {/* 1-100 Numbers Matrix Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-2 custom-scrollbar">
        {displayedNumbers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Filter className="w-8 h-8 mb-2 opacity-40 text-amber-500" />
            <p className="text-xs font-mono font-semibold">No numbers match this filter</p>
            <p className="text-[10px] mt-0.5">Switch filter to 'All' or clear your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 xl:grid-cols-8 gap-1.5 pb-2">
            {displayedNumbers.map((num) => {
              const participant = assignedMap.get(num);
              const isSelected = !!participant;
              const isWon = wonNumbersMap.has(num);

              if (isSelected) {
                // Number is SELECTED / TAKEN
                return (
                  <div
                    key={num}
                    className={`
                      relative group flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all
                      ${
                        isWon
                          ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                          : 'bg-amber-950/25 border-amber-500/30 hover:border-amber-500/60'
                      }
                    `}
                    title={`#${num} - ${participant.name}${isWon ? ' (Winner!)' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-black text-xs text-amber-400">
                        #{num}
                      </span>
                      {isWon && (
                        <Trophy className="w-2.5 h-2.5 text-yellow-400 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[9.5px] text-slate-300 font-semibold truncate max-w-full leading-tight mt-0.5 px-0.5">
                      {participant.name}
                    </span>
                    <span className="text-[8px] font-mono text-amber-500/80 uppercase tracking-wider mt-0.5 font-bold">
                      TAKEN
                    </span>

                    {/* Quick remove button on hover */}
                    {onRemoveParticipant && !isLocked && (
                      <button
                        onClick={() => onRemoveParticipant(participant.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title={`Remove #${num} ${participant.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              } else {
                // Number is AVAILABLE
                return (
                  <button
                    key={num}
                    onClick={() => handleStartAssign(num)}
                    disabled={isLocked}
                    className="
                      group flex flex-col items-center justify-center p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/15
                      hover:bg-emerald-500/25 hover:border-emerald-500/60 hover:scale-105 active:scale-95 transition-all cursor-pointer
                      disabled:opacity-40 disabled:pointer-events-none text-center
                    "
                    title={`Number #${num} is available! Click to assign participant.`}
                  >
                    <span className="font-mono font-black text-xs text-emerald-400 group-hover:text-emerald-300">
                      #{num}
                    </span>
                    <span className="text-[8px] font-mono text-emerald-400/70 group-hover:text-emerald-300 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                      FREE
                    </span>
                  </button>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="shrink-0 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-300 font-bold">{availableCount}</span> Free
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-300 font-bold">{selectedCount}</span> Taken
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          Click any free number to assign
        </span>
      </div>
    </div>
  );
};
