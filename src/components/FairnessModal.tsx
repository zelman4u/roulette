import React from 'react';
import { X, ShieldCheck, Cpu, Lock, CheckCircle } from 'lucide-react';

interface FairnessModalProps {
  onClose: () => void;
  lastSeed?: string;
}

export const FairnessModal: React.FC<FairnessModalProps> = ({ onClose, lastSeed }) => {
  return (
    <div
      id="fairness-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-200 tracking-widest">
                Fairness & Randomization
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded border border-white/10 bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-slate-300 font-medium">
            &ldquo;The winner is selected randomly by the application. The wheel animation is only a visual representation of the random result.&rdquo;
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">CSPRNG Web Crypto Engine</h4>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  Selection uses <code className="text-amber-400 bg-black/60 px-1 py-0.5 rounded font-mono">window.crypto.getRandomValues</code> with rejection sampling to eliminate modulo bias. Every participant has an exactly equal 1/N probability of winning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Zero Manipulation Guarantee</h4>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  There are no hidden admin switches, no predetermined outcomes, and no influence from click speed, position, or participant order.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Result Seed Verification</h4>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  Each spin generates a verifiable entropy timestamp seed to ensure historical auditability.
                </p>
                {lastSeed && (
                  <div className="mt-2 p-2 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-amber-400 break-all">
                    Latest Spin Seed: {lastSeed}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-lg text-xs cursor-pointer transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
