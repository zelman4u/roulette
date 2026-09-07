import React from 'react';
import { WheelSettings } from '../types';
import { X, Settings, Volume2, VolumeX, Sparkles, Coins, Eye, RotateCw, Flame } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SettingsModalProps {
  settings: WheelSettings;
  onUpdateSettings: (newSettings: Partial<WheelSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const handleToggleSound = (enabled: boolean) => {
    soundManager.setSoundEnabled(enabled);
    onUpdateSettings({ soundEnabled: enabled });
  };

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-200 tracking-widest">
                Spin & Wheel Settings
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

        {/* Settings Body */}
        <div className="mt-4 space-y-4">
          {/* Spin Duration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Spin Duration:</span>
              <strong className="text-amber-500 font-mono">{settings.spinDuration}s</strong>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 8, 10].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => onUpdateSettings({ spinDuration: dur })}
                  className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    settings.spinDuration === dur
                      ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-black/40 hover:bg-white/5 text-slate-300 border-white/10'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          {/* Number of Rotations */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3 h-3 text-amber-500" />
                Rotations Before Winner:
              </span>
              <strong className="text-amber-500 font-mono">{settings.rotations} turns</strong>
            </label>
            <input
              type="range"
              min={5}
              max={15}
              step={1}
              value={settings.rotations}
              onChange={(e) => onUpdateSettings({ rotations: parseInt(e.target.value) || 8 })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider">
              <span>5 (Fast)</span>
              <span>8 (Balanced)</span>
              <span>15 (Dramatic)</span>
            </div>
          </div>

          {/* Toggles Group */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Audio & Visual Effects
            </h4>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-200">Sound Effects</div>
                  <div className="text-[10px] text-slate-400">
                    Wheel ticks, spin whoosh, and victory fanfare
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleToggleSound(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Confetti Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Confetti Explosion</div>
                  <div className="text-[10px] text-slate-400">
                    Burst confetti when a winner is declared
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.confettiEnabled}
                onChange={(e) => onUpdateSettings({ confettiEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Fireworks Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Victory Fireworks</div>
                  <div className="text-[10px] text-slate-400">
                    Multi-stage celebration fireworks on win
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.fireworksEnabled}
                onChange={(e) => onUpdateSettings({ fireworksEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Show Names on Wheel */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Show Names on Wheel</div>
                  <div className="text-[10px] text-slate-400">
                    Render names directly inside roulette segments
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showNamesOnWheel}
                onChange={(e) => onUpdateSettings({ showNamesOnWheel: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Auto Remove Winner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="text-rose-400 font-bold text-xs">❌</div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Auto-Remove Winner</div>
                  <div className="text-[10px] text-slate-400">
                    Exclude winner from future spins in current session
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRemoveWinner}
                onChange={(e) => onUpdateSettings({ autoRemoveWinner: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Virtual Betting Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Virtual Entertainment Betting</div>
                  <div className="text-[10px] text-slate-400">
                    Play with mock credits (No real money involved)
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.virtualBettingEnabled}
                onChange={(e) => onUpdateSettings({ virtualBettingEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-lg text-xs cursor-pointer transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
