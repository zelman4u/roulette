import React, { useState, useMemo, useRef } from 'react';
import { Participant } from '../types';
import {
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  Clipboard,
  Users,
  Search,
  Hash,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SAMPLE_NAMES_12, SAMPLE_NAMES_30, SAMPLE_NAMES_100 } from '../utils/sampleData';

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (name: string, assignedNumber?: number) => boolean;
  onBulkAdd: (names: (string | { name: string; assignedNumber?: number })[]) => void;
  onUpdateParticipant: (id: string, newName: string, newNumber?: number) => void;
  onRemoveParticipant: (id: string) => void;
  onClearAll: () => void;
  onRemoveDuplicates: () => void;
  onAutoNumber: () => void;
  onSortByNumber: () => void;
  onViewNumbersBoard?: () => void;
  isLocked: boolean;
}

function parseLineForParticipant(line: string): { name: string; assignedNumber?: number } {
  const clean = line.replace(/^["']|["']$/g, '').trim();
  if (!clean) return { name: '' };

  // Match CSV format: "1, Alice" or "Alice, 1"
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length >= 2) {
      const num1 = parseInt(parts[0].replace(/^#/, ''), 10);
      const num2 = parseInt(parts[1].replace(/^#/, ''), 10);
      if (!isNaN(num1) && num1 > 0 && isNaN(num2)) {
        return { name: parts.slice(1).join(' ').trim(), assignedNumber: num1 };
      }
      if (isNaN(num1) && !isNaN(num2) && num2 > 0) {
        return { name: parts[0], assignedNumber: num2 };
      }
    }
  }

  // Match "#1. David Chen", "#1.David Chen", "#1 David Chen", "1. David Chen", "1 - David Chen", "[1] David Chen", "1) David Chen"
  const leadingMatch = clean.match(/^(?:\[?#?(\d+)\]?[\s.:\-)]+)(.+)$/);
  if (leadingMatch) {
    const num = parseInt(leadingMatch[1], 10);
    const name = leadingMatch[2].trim();
    if (!isNaN(num) && num > 0 && name) {
      return { name, assignedNumber: num };
    }
  }

  // Match "David Chen #1", "David Chen (1)", "David Chen - 1"
  const trailingMatch = clean.match(/^(.+?)(?:[\s\-:(]+#?(\d+)\)?)$/);
  if (trailingMatch) {
    const name = trailingMatch[1].trim();
    const num = parseInt(trailingMatch[2], 10);
    if (!isNaN(num) && num > 0 && name) {
      return { name, assignedNumber: num };
    }
  }

  return { name: clean };
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onAddParticipant,
  onBulkAdd,
  onUpdateParticipant,
  onRemoveParticipant,
  onClearAll,
  onRemoveDuplicates,
  onAutoNumber,
  onSortByNumber,
  onViewNumbersBoard,
  isLocked,
}) => {
  const [singleName, setSingleName] = useState('');
  const [singleNumber, setSingleNumber] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNumber, setEditingNumber] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Set of already selected / assigned numbers
  const assignedNumbersMap = useMemo(() => {
    const map = new Map<number, Participant>();
    participants.forEach((p) => {
      if (typeof p.assignedNumber === 'number' && p.assignedNumber >= 1 && p.assignedNumber <= 100) {
        map.set(p.assignedNumber, p);
      }
    });
    return map;
  }, [participants]);

  // Compute next available integer for the suggested number
  const suggestedNextNumber = useMemo(() => {
    let candidate = 1;
    while (assignedNumbersMap.has(candidate)) {
      candidate++;
    }
    return candidate <= 100 ? candidate : 1;
  }, [assignedNumbersMap]);

  // Available numbers stats
  const availableNumbersCount = Math.max(100 - assignedNumbersMap.size, 0);

  // Quick list of first 7 available numbers for 1-click selection
  const quickAvailableNumbers = useMemo(() => {
    const free: number[] = [];
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbersMap.has(i)) {
        free.push(i);
        if (free.length >= 7) break;
      }
    }
    return free;
  }, [assignedNumbersMap]);

  // Check if currently entered number is already selected
  const typedNumberVal = useMemo(() => {
    if (!singleNumber.trim()) return null;
    const n = parseInt(singleNumber.trim(), 10);
    return isNaN(n) ? null : n;
  }, [singleNumber]);

  const currentNumberTakenBy = useMemo(() => {
    if (typedNumberVal === null) return null;
    return assignedNumbersMap.get(typedNumberVal) || null;
  }, [typedNumberVal, assignedNumbersMap]);

  // Check for duplicates
  const duplicateInfo = useMemo(() => {
    const counts = new Map<string, number>();
    participants.forEach((p) => {
      const normalized = p.name.trim().toLowerCase();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });

    const duplicateNames = Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    return {
      hasDuplicates: duplicateNames.length > 0,
      duplicateCount: duplicateNames.length,
      isDuplicate: (name: string) => (counts.get(name.trim().toLowerCase()) || 0) > 1,
    };
  }, [participants]);

  // Filtered participant list (searches name or assigned number)
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase().replace(/^#/, '');
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.assignedNumber !== undefined && String(p.assignedNumber).includes(q))
    );
  }, [participants, searchQuery]);

  const handleNameInputChange = (val: string) => {
    setSingleName(val);
    // If user types or pastes "#1. David Chen" or "1. David Chen", auto-sync number
    const match = val.match(/^(?:\[?#?(\d+)\]?[\s.:\-)]+)(.+)$/);
    if (match && !singleNumber) {
      const detectedNum = parseInt(match[1], 10);
      if (!isNaN(detectedNum) && detectedNum >= 1 && detectedNum <= 100) {
        setSingleNumber(String(detectedNum));
      }
    }
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || isLocked) return;
    if (participants.length >= 100) return;

    // Smart-extract number and clean name if typed directly e.g. "#1. David Chen"
    const parsed = parseLineForParticipant(singleName.trim());
    const finalName = parsed.name || singleName.trim();
    let finalNum: number;
    if (singleNumber.trim()) {
      finalNum = parseInt(singleNumber.trim(), 10);
    } else if (parsed.assignedNumber !== undefined && parsed.assignedNumber > 0) {
      finalNum = parsed.assignedNumber;
    } else {
      finalNum = suggestedNextNumber;
    }

    const success = onAddParticipant(finalName, finalNum);
    if (success) {
      setSingleName('');
      setSingleNumber('');
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim() || isLocked) return;
    const rawLines = bulkText
      .split(/[\r\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const parsedItems = rawLines.map(parseLineForParticipant);
    onBulkAdd(parsedItems);
    setBulkText('');
    setShowBulkModal(false);
  };

  const handleFileUpload = (file: File) => {
    setFileError(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const rawLines = text
          .split(/[\r\n]+/)
          .map((n) => n.trim())
          .filter((n) => n.length > 0);

        if (rawLines.length === 0) {
          setFileError('File contained no valid entries.');
          return;
        }

        const parsedItems = rawLines.map(parseLineForParticipant);
        onBulkAdd(parsedItems);
      } catch {
        setFileError('Failed to parse file. Please provide a plain text or CSV file.');
      }
    };
    reader.onerror = () => setFileError('Error reading file.');
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLocked) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const startEditing = (p: Participant) => {
    if (isLocked) return;
    setEditingId(p.id);
    setEditingName(p.name);
    setEditingNumber(p.assignedNumber ? String(p.assignedNumber) : '');
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      const parsed = parseLineForParticipant(editingName.trim());
      const finalName = parsed.name || editingName.trim();
      let finalNum: number | undefined;
      if (editingNumber.trim()) {
        finalNum = parseInt(editingNumber.trim(), 10);
      } else if (parsed.assignedNumber !== undefined && parsed.assignedNumber > 0) {
        finalNum = parsed.assignedNumber;
      }
      onUpdateParticipant(editingId, finalName, finalNum);
    }
    setEditingId(null);
    setEditingName('');
    setEditingNumber('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingNumber('');
  };

  const isFull = participants.length >= 100;

  return (
    <div
      id="participant-manager"
      className="bg-[#18181b]/90 border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl flex flex-col h-full min-h-0 backdrop-blur-md overflow-hidden"
    >
      {/* Header with Counter and Actions */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase text-slate-300 tracking-widest">
            Participants ({participants.length}/100)
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {participants.length > 1 && (
            <>
              <button
                id="renumber-participants-button"
                onClick={onAutoNumber}
                disabled={isLocked}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 text-[10px] font-mono border border-white/10 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
                title="Renumber all participants sequentially (1..N)"
              >
                <Hash className="w-2.5 h-2.5 text-amber-400" />
                <span>1..N</span>
              </button>
              <button
                id="sort-participants-button"
                onClick={onSortByNumber}
                disabled={isLocked}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 text-[10px] font-mono border border-white/10 cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1"
                title="Sort participants by assigned number"
              >
                <ArrowUpDown className="w-2.5 h-2.5 text-amber-400" />
                <span>Sort #</span>
              </button>
            </>
          )}

          {duplicateInfo.hasDuplicates && (
            <button
              id="remove-duplicates-button"
              onClick={onRemoveDuplicates}
              disabled={isLocked}
              className="text-[10px] text-slate-400 hover:text-amber-400 uppercase font-mono cursor-pointer disabled:opacity-40 transition-colors"
              title="Remove duplicate names if desired"
            >
              Deduplicate
            </button>
          )}
          {participants.length > 0 && (
            <button
              id="clear-all-participants-button"
              onClick={onClearAll}
              disabled={isLocked}
              className="text-[10px] text-rose-400 uppercase font-bold hover:underline cursor-pointer disabled:opacity-40"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Presets */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mr-1">
          Presets:
        </span>
        <button
          onClick={() => onBulkAdd(SAMPLE_NAMES_12)}
          disabled={isLocked}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold border border-white/10 cursor-pointer disabled:opacity-40 transition-colors"
          title="Load 12 sample participants"
        >
          +12 Names
        </button>
        <button
          onClick={() => onBulkAdd(SAMPLE_NAMES_30)}
          disabled={isLocked}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold border border-white/10 cursor-pointer disabled:opacity-40 transition-colors"
          title="Load 30 sample participants"
        >
          +30 Names
        </button>
        <button
          onClick={() => onBulkAdd(SAMPLE_NAMES_100)}
          disabled={isLocked}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold border border-white/10 cursor-pointer disabled:opacity-40 transition-colors"
          title="Load 100 sample names"
        >
          +100 Names
        </button>
        <button
          onClick={() => {
            const list: string[] = [];
            for (let i = 1; i <= 100; i++) {
              list.push(`#${i}. Ticket ${i}`);
            }
            onBulkAdd(list.map(parseLineForParticipant));
          }}
          disabled={isLocked}
          className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[10px] font-bold border border-amber-500/30 cursor-pointer disabled:opacity-40 transition-colors"
          title="Load 100 numbered raffle tickets (1-100)"
        >
          +100 Raffle (1-100)
        </button>
      </div>

      {/* Available Numbers Live Quick Bar */}
      <div className="mt-2 flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 text-[11px] font-mono">
            Available: <strong className="text-emerald-400 font-bold">{availableNumbersCount}</strong>/100
          </span>
        </div>

        {/* Quick-pick free number pills */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] no-scrollbar px-1">
          <span className="text-[10px] text-slate-500 font-mono shrink-0">Free:</span>
          {quickAvailableNumbers.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setSingleNumber(String(num))}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer shrink-0 ${
                singleNumber === String(num)
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title={`Pick available number #${num}`}
            >
              #{num}
            </button>
          ))}
        </div>

        {onViewNumbersBoard && (
          <button
            type="button"
            onClick={onViewNumbersBoard}
            className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 shrink-0 ml-1 cursor-pointer transition-colors"
            title="View full 1-100 Numbers Status Board"
          >
            All 100 ➔
          </button>
        )}
      </div>

      {/* Add Single Participant Form with Assigned Number */}
      <form onSubmit={handleAddSingle} className="mt-1.5 flex flex-col gap-1 shrink-0">
        <div className="flex gap-1.5">
          <div className="relative w-20 shrink-0" title="Assign participant number 1-100 (auto-suggested if left blank)">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 font-mono font-bold text-xs pointer-events-none">
              #
            </span>
            <input
              id="single-participant-number-input"
              type="number"
              min={1}
              max={100}
              placeholder={String(suggestedNextNumber)}
              value={singleNumber}
              onChange={(e) => setSingleNumber(e.target.value)}
              disabled={isLocked || isFull}
              className={`w-full bg-black/40 border rounded-lg pl-5 pr-1 py-1.5 text-xs font-mono font-bold focus:outline-none disabled:opacity-50 text-center ${
                currentNumberTakenBy
                  ? 'border-rose-500 text-rose-400 bg-rose-950/20 focus:border-rose-400'
                  : typedNumberVal !== null && typedNumberVal >= 1 && typedNumberVal <= 100
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 focus:border-emerald-400'
                  : 'border-white/10 text-amber-400 placeholder-amber-500/40 focus:border-amber-500/60'
              }`}
            />
          </div>
          <input
            id="single-participant-input"
            type="text"
            placeholder={isFull ? 'Limit reached (100)' : 'e.g. #1. David Chen'}
            value={singleName}
            onChange={(e) => handleNameInputChange(e.target.value)}
            disabled={isLocked || isFull}
            maxLength={40}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 disabled:opacity-50 transition-colors"
          />
          <button
            id="add-participant-button"
            type="submit"
            disabled={isLocked || isFull || !singleName.trim() || currentNumberTakenBy !== null}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-40 cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 inline mr-1" />
            Add
          </button>
        </div>

        {/* Live Number Availability Feedback */}
        {currentNumberTakenBy ? (
          <div className="px-2 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10.5px] font-mono text-rose-300 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                <strong>#{typedNumberVal}</strong> ALREADY TAKEN by <strong>{currentNumberTakenBy.name}</strong>!
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSingleNumber(String(suggestedNextNumber))}
              className="text-amber-400 hover:text-amber-300 underline shrink-0 ml-1 cursor-pointer font-bold"
            >
              Use #{suggestedNextNumber}
            </button>
          </div>
        ) : typedNumberVal !== null && typedNumberVal >= 1 && typedNumberVal <= 100 ? (
          <div className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10.5px] font-mono text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Number #{typedNumberVal} is AVAILABLE to assign!</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between px-0.5">
            <span>
              Type format: <strong className="text-amber-400">#1. David Chen</strong> or <strong className="text-amber-400">100. Alex</strong>
            </span>
            <span className="text-slate-500">1-100 numbers</span>
          </div>
        )}
      </form>

      {/* Bulk Action Buttons (Paste Multiple / CSV Import) */}
      <div className="mt-2 flex items-center gap-2 shrink-0">
        <button
          id="open-bulk-paste-button"
          onClick={() => setShowBulkModal(true)}
          disabled={isLocked || isFull}
          className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Clipboard className="w-3 h-3 text-amber-400" />
          <span>Paste Multiple</span>
        </button>

        <label
          htmlFor="csv-file-upload"
          className={`flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            isLocked || isFull ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <Upload className="w-3 h-3 text-amber-400" />
          <span>Import CSV/TXT</span>
          <input
            id="csv-file-upload"
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
            disabled={isLocked || isFull}
            className="hidden"
          />
        </label>
      </div>

      {fileError && <p className="text-xs text-rose-400 mt-1 shrink-0">{fileError}</p>}

      {/* Drag and Drop Zone if empty */}
      {participants.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-3 flex-1 min-h-[140px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-500 hover:border-white/20 transition-colors"
        >
          <Users className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-300">No participants yet</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Type names with numbers above (e.g. #7 Alice), paste multiple, or drop a file here.
          </p>
        </div>
      )}

      {/* Search & List of Participants */}
      {participants.length > 0 && (
        <div className="mt-2.5 flex flex-col flex-1 min-h-0">
          {/* Search bar for larger lists */}
          {participants.length > 8 && (
            <div className="relative mb-2 shrink-0">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or # number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          {/* Scrollable participant list - expands to fill panel and scrolls internally */}
          <div
            id="participant-list-container"
            className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1"
          >
            {filteredParticipants.map((p, idx) => {
              const isEditing = editingId === p.id;
              const assignedNum = p.assignedNumber ?? (idx + 1);

              return (
                <div
                  key={p.id}
                  id={`participant-row-${p.id}`}
                  className="group flex items-center justify-between p-1.5 sm:p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                      <div className="relative w-16 shrink-0">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-[11px]">
                          #
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={editingNumber}
                          onChange={(e) => setEditingNumber(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="w-full bg-black/70 border border-amber-500/60 rounded pl-4 pr-1 py-0.5 text-xs text-amber-300 font-mono font-bold focus:outline-none text-center"
                          title="Assigned Number"
                        />
                      </div>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        className="flex-1 bg-black/60 border border-amber-500/60 rounded px-2 py-0.5 text-xs text-white focus:outline-none min-w-0"
                        title="Participant Name"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: p.color }}
                      />
                      <span
                        className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0 min-w-[28px] text-center"
                        title={`Assigned Number #${assignedNum}`}
                      >
                        #{assignedNum}
                      </span>
                      <span className="text-xs text-slate-200 font-medium truncate" title={p.name}>
                        {p.name}
                      </span>
                    </div>
                  )}

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEditing}
                          className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-slate-400 hover:text-slate-300 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(p)}
                          disabled={isLocked}
                          className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
                          title="Edit name and assigned number"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemoveParticipant(p.id)}
                          disabled={isLocked}
                          className="p-1 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30"
                          title="Remove participant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {showBulkModal && (
        <div
          id="bulk-paste-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-amber-500" />
                Paste Multiple Names & Numbers
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Paste names separated by newlines. You can optionally include assigned numbers (e.g.{' '}
              <code className="text-amber-400 font-mono">1. John Wick</code> or{' '}
              <code className="text-amber-400 font-mono">#7 James Bond</code>).
            </p>

            <textarea
              id="bulk-names-textarea"
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="1. John Wick&#10;2. Sarah Connor&#10;#7 James Bond&#10;Ellen Ripley&#10;42. Luke Skywalker"
              className="mt-3 w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 font-mono resize-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                id="submit-bulk-names-button"
                onClick={handleBulkSubmit}
                disabled={!bulkText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                Import Names
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
