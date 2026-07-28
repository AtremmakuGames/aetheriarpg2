import React from 'react';
import { SkillNode } from '../types';
import { sound } from '../audio';
import { Sparkles, Zap, Flame, Wind, Coins, Lock, Check, Clock } from 'lucide-react';

interface SkillTreePanelProps {
  skills: SkillNode[];
  skillPoints: number;
  onUnlockSkill: (skillId: string) => void;
}

export const SkillTreePanel: React.FC<SkillTreePanelProps> = ({
  skills,
  skillPoints,
  onUnlockSkill,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-black text-slate-100">Abilities & Skill Matrix</h2>
            <p className="text-xs text-slate-400">
              Unlock powerful active spells and passive harvesting multipliers
            </p>
          </div>
        </div>

        <div className="bg-amber-950/80 border border-amber-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">Skill Points:</span>
          <span className="text-sm font-black text-amber-400 font-mono">{skillPoints}</span>
        </div>
      </div>

      {/* Skill Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => {
          const reqSkill = skill.reqSkillId ? skills.find((s) => s.id === skill.reqSkillId) : null;
          const reqMet = !reqSkill || reqSkill.unlocked;
          const canUnlock = !skill.unlocked && reqMet && skillPoints >= skill.costPoints;

          return (
            <div
              key={skill.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative ${
                skill.unlocked
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-indigo-950/30 border-amber-500/50 shadow-lg'
                  : reqMet
                  ? 'bg-slate-950 border-slate-800 text-slate-400'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border ${
                        skill.unlocked
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {skill.id === 'whirlwind_harvest' && <Wind className="w-5 h-5" />}
                      {skill.id === 'meteor_strike' && <Flame className="w-5 h-5" />}
                      {skill.id === 'arcane_overcharge' && <Zap className="w-5 h-5" />}
                      {skill.id === 'gold_frenzy' && <Coins className="w-5 h-5" />}
                      {skill.id === 'time_dilation' && <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-100">{skill.name}</h3>
                      <span className="text-[10px] font-bold uppercase text-amber-400">
                        Tier {skill.tier} {skill.category}
                      </span>
                    </div>
                  </div>

                  {skill.unlocked && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      <Check className="w-3 h-3" /> Unlocked
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2">{skill.description}</p>

                {/* Cooldown & Mana Info */}
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span>Cooldown: {skill.cooldownSec}s</span>
                  <span>|</span>
                  <span>Energy: {skill.manaCost}</span>
                </div>
              </div>

              {/* Requirement & Unlock Action */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {reqSkill && !reqSkill.unlocked ? (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Requires: {reqSkill.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Cost: {skill.costPoints} SP
                  </span>
                )}

                {!skill.unlocked && (
                  <button
                    disabled={!canUnlock}
                    onClick={() => {
                      if (canUnlock) {
                        sound.playAchievement();
                        onUnlockSkill(skill.id);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      canUnlock
                        ? 'bg-amber-500 text-slate-950 hover:scale-105 active:scale-95 shadow-md font-extrabold'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {!reqMet ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : skillPoints < skill.costPoints ? (
                      'Need SP'
                    ) : (
                      'Unlock Ability'
                    )}
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
