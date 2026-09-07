import React from 'react';
import { AlertOctagon, X, RotateCcw } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="reset-session-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#18181b] border border-rose-500/30 rounded-xl w-full max-w-md p-6 shadow-2xl text-center">
        {/* Warning Icon */}
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
          <AlertOctagon className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1.5">
          Reset Current Session?
        </h3>

        <p className="text-xs text-slate-400 mb-4">
          This action will permanently clear participants, history, and virtual bets:
        </p>

        <div className="p-3 bg-black/40 rounded-lg text-[11px] text-slate-300 mb-5 text-left space-y-1.5 border border-white/5 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span>All participants currently on wheel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span>Full winner history and timestamps</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span>Virtual credits balance and placed bets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span>Current roulette rotation state</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            id="cancel-reset-button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-white/10"
          >
            Cancel
          </button>
          <button
            id="confirm-reset-button"
            onClick={onConfirmReset}
            className="flex-1 py-2 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
