import React from 'react';
import { Achievement } from '../types';
import { sound } from '../audio';
import { Trophy, Award, Check, Sparkles, ShieldCheck, Pickaxe, Cloud, Hammer, Axe } from 'lucide-react';

interface AchievementsPanelProps {
  achievements: Achievement[];
  onClaimReward: (achievementId: string) => void;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  onClaimReward,
}) => {
  const iconMap: Record<string, React.ElementType> = {
    Axe: Axe,
    Pickaxe: Pickaxe,
    ShieldCheck: ShieldCheck,
    Sparkles: Sparkles,
    Cloud: Cloud,
    Hammer: Hammer,
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-black text-slate-100">Hero Achievements & Trophies</h2>
            <p className="text-xs text-slate-400">Complete quests to unlock rare Gems and bonus XP</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300">
          Trophies Unlocked: <span className="text-amber-400">{unlockedCount}</span> / {achievements.length}
        </div>
      </div>

      {/* Achievements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map((ach) => {
          const IconComp = iconMap[ach.iconName] || Trophy;
          const isReadyToClaim = !ach.unlocked && ach.currentProgress >= ach.targetProgress;
          const progressPercent = Math.min(100, (ach.currentProgress / ach.targetProgress) * 100);

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                ach.unlocked
                  ? 'bg-slate-950/60 border-slate-800 opacity-80'
                  : isReadyToClaim
                  ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500 shadow-lg animate-pulse'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        ach.unlocked
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                          : isReadyToClaim
                          ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-100">{ach.name}</h3>
                      <p className="text-xs text-slate-400">{ach.description}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Progress</span>
                    <span>
                      {ach.currentProgress} / {ach.targetProgress}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Reward & Claim */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
                  <span>+{ach.rewardGems} 💎 Gems</span>
                  <span>|</span>
                  <span>+{ach.rewardXP} XP</span>
                </div>

                {ach.unlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
                    <Check className="w-3.5 h-3.5" /> Claimed
                  </span>
                ) : (
                  <button
                    disabled={!isReadyToClaim}
                    onClick={() => {
                      if (isReadyToClaim) {
                        sound.playAchievement();
                        onClaimReward(ach.id);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isReadyToClaim
                        ? 'bg-amber-500 text-slate-950 hover:scale-105 active:scale-95 shadow-md font-extrabold'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {isReadyToClaim ? 'Claim Reward' : 'In Progress'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
