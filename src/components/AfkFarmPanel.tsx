import React from 'react';
import { Resources } from '../types';
import { sound } from '../audio';
import { Bot, Zap, Play, Coins, Heart, Clock, CheckCircle, Sparkles } from 'lucide-react';

interface AfkFarmPanelProps {
  resources: Resources;
  onBuyAfkFarmer: () => void;
  onActivateAfkFarmer: () => void;
  isAfkActive: boolean;
  afkTimeRemaining: number;
  activeZoneName: string;
  onUseHealingPotion: () => void;
}

export const AfkFarmPanel: React.FC<AfkFarmPanelProps> = ({
  resources,
  onBuyAfkFarmer,
  onActivateAfkFarmer,
  isAfkActive,
  afkTimeRemaining,
  activeZoneName,
  onUseHealingPotion,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const canBuy = resources.gold >= 7500;
  const hasCharges = resources.afkFarmerCharges > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 select-none">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl shadow-lg text-slate-950">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              AFK Auto-Farmer & Consumables
              {isAfkActive && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono font-extrabold animate-pulse">
                  ACTIVE
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Automate resource extraction and instant healing during intense multidimensional combat
            </p>
          </div>
        </div>

        {/* Healing Potion Quick Consumable Bar */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="relative">
            <div className="p-2 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-400">
              <Heart className="w-5 h-5 fill-rose-500" />
            </div>
            {/* Potion Remaining Badge Counter */}
            <span className="absolute -top-2 -right-2 bg-rose-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow border border-slate-900">
              {resources.healingPotions}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-400">HEALING POTIONS</div>
            <button
              disabled={resources.healingPotions <= 0}
              onClick={() => {
                sound.playSkillCast();
                onUseHealingPotion();
              }}
              className={`mt-0.5 px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                resources.healingPotions > 0
                  ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-md active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>Drink Potion (+300 HP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* AFK Farmer Main Control Unit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase & Charge Status */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> AFK Farmer Module
              </span>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                Purchased Charges: {resources.afkFarmerCharges}
              </span>
            </div>

            <h3 className="text-base font-black text-slate-100">Auto-Harvest Drone (5 Minutes)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Buys 1 activation charge for 7,500 Gold. Upon activation, the drone mines resources and harvests XP from <span className="text-amber-400 font-bold">{activeZoneName}</span> at extreme gathering speed automatically!
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-black text-sm">
              <Coins className="w-4 h-4" />
              <span>7,500 Gold</span>
            </div>

            <button
              disabled={!canBuy}
              onClick={() => {
                sound.playCraft();
                onBuyAfkFarmer();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                canBuy
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:scale-105 active:scale-95 shadow-lg'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Buy AFK Farmer (+1 Charge)</span>
            </button>
          </div>
        </div>

        {/* Activation & Timer Visualizer */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between text-center relative overflow-hidden">
          {isAfkActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 animate-pulse pointer-events-none"></div>
          )}

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {isAfkActive ? '⚡ AFK FARMING IN PROGRESS' : 'READY TO DEPLOY'}
            </div>

            {/* Display Big Digital Timer */}
            <div className="my-3">
              {isAfkActive ? (
                <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2">
                  <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-spin-slow" />
                  <span>{formatTime(afkTimeRemaining)}</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl font-mono font-black text-slate-600">
                  05:00
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {isAfkActive
                ? `Mining resources and earning XP in ${activeZoneName} at max speed...`
                : hasCharges
                ? 'Click below to start 5 minutes of automated high-speed resource harvesting!'
                : 'Purchase a charge with Gold to enable auto-farming.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            {isAfkActive ? (
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>AFK Farmer Running ({formatTime(afkTimeRemaining)})</span>
              </div>
            ) : (
              <button
                disabled={!hasCharges}
                onClick={() => {
                  sound.playSkillCast();
                  onActivateAfkFarmer();
                }}
                className={`w-full py-3 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-2 ${
                  hasCharges
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:scale-102 active:scale-98 shadow-xl shadow-emerald-950/50'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>ACTIVATE AFK FARMER (5 MIN)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
