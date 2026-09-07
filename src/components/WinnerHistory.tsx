import React from 'react';
import { SpinHistoryItem } from '../types';
import { History, Trash2, Download, UserMinus, ShieldCheck } from 'lucide-react';

interface WinnerHistoryProps {
  history: SpinHistoryItem[];
  autoRemoveWinner: boolean;
  onToggleAutoRemove: (enabled: boolean) => void;
  onClearHistory: () => void;
  onRemoveWinnerFromParticipants: (winnerId: string, winnerName: string) => void;
}

export const WinnerHistory: React.FC<WinnerHistoryProps> = ({
  history,
  autoRemoveWinner,
  onToggleAutoRemove,
  onClearHistory,
  onRemoveWinnerFromParticipants,
}) => {
  const exportCSV = () => {
    if (history.length === 0) return;

    const headers = ['#', 'Assigned #', 'Winner', 'Date', 'Time', 'Total Participants', 'Verification Seed'];
    const rows = history.map((item, idx) => [
      idx + 1,
      item.winnerNumber ? `#${item.winnerNumber}` : '-',
      `"${item.winnerName.replace(/"/g, '""')}"`,
      `"${item.date}"`,
      `"${item.time}"`,
      item.totalParticipants,
      `"${item.seedVerification}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `roulette-winners-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="winner-history-panel"
      className="bg-[#18181b]/90 border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl flex flex-col h-full min-h-0 backdrop-blur-md overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <History className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase text-slate-300 tracking-widest">
            Winner History ({history.length})
          </h2>
        </div>

        {/* History Action Buttons */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              id="export-history-csv-button"
              onClick={exportCSV}
              className="py-1 px-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
              title="Export history as CSV"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
            <button
              id="clear-history-button"
              onClick={onClearHistory}
              className="py-1 px-2 bg-white/5 hover:bg-white/10 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
              title="Clear winner history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Auto-remove checkbox option */}
      <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between shrink-0">
        <label
          htmlFor="auto-remove-checkbox"
          className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer select-none"
        >
          <input
            id="auto-remove-checkbox"
            type="checkbox"
            checked={autoRemoveWinner}
            onChange={(e) => onToggleAutoRemove(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 text-amber-500 focus:ring-amber-400 bg-black/60 cursor-pointer accent-amber-500"
          />
          <span className="text-[11px] font-medium text-slate-400">Auto-remove winner after spin</span>
        </label>
        {autoRemoveWinner && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
            ON
          </span>
        )}
      </div>

      {/* History Table */}
      {history.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center flex-1">
          <History className="w-8 h-8 text-slate-600 mb-2 opacity-40" />
          <p className="font-semibold text-slate-400">No spins recorded yet</p>
          <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">
            Spin the wheel to log winners
          </p>
        </div>
      ) : (
        <div className="mt-2.5 overflow-hidden border border-white/5 rounded-lg flex-1 min-h-0 flex flex-col">
          <div className="overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="sticky top-0 bg-[#18181b] z-10">
                <tr className="bg-white/5">
                  <th className="p-2 font-bold text-slate-500 border-b border-white/10 w-10">#</th>
                  <th className="p-2 font-bold text-slate-500 border-b border-white/10">Winner</th>
                  <th className="p-2 font-bold text-slate-500 border-b border-white/10 w-16">Time</th>
                  <th className="p-2 font-bold text-slate-500 border-b border-white/10 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 divide-y divide-white/5 font-sans">
                {history.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-2 text-amber-500 font-mono font-bold text-[10px]">
                      {String(history.length - idx).padStart(2, '0')}
                    </td>
                    <td className="p-2 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.winnerNumber !== undefined && (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            #{item.winnerNumber}
                          </span>
                        )}
                        <span className="truncate max-w-[120px]" title={item.winnerName}>
                          {item.winnerName}
                        </span>
                      </div>
                      {item.betResult && (
                        <div
                          className={`text-[9px] font-mono ${
                            item.betResult.won ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {item.betResult.won
                            ? `+${item.betResult.payout} pts`
                            : `-${item.betResult.betAmount} pts`}
                        </div>
                      )}
                    </td>
                    <td className="p-2 opacity-60 text-[10px] font-mono whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() =>
                          onRemoveWinnerFromParticipants(item.winnerId, item.winnerName)
                        }
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer"
                        title="Remove from current wheel"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer / Transparency */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          CSPRNG Cryptographic Spin
        </span>
        <span className="font-mono">Total: {history.length}</span>
      </div>
    </div>
  );
};
