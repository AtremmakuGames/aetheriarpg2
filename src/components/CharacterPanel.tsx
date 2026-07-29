import React, { useState } from 'react';
import { Character, EquipmentItem, HeroClass, Resources } from '../types';
import { sound } from '../audio';
import { Shield, Zap, Sparkles, Sword, Heart, Plus, Trophy, Award, Shirt, Lock, Coins, Gem, Check, Edit2, CheckCircle2, X } from 'lucide-react';

interface CharacterPanelProps {
  character: Character;
  resources: Resources;
  onAllocateStat: (statKey: keyof Character['attributes']) => void;
  onChangeClass: (newClass: HeroClass) => void;
  onUnlockClass?: (heroClass: HeroClass, currency: 'gold' | 'gems') => void;
  onUnequipItem: (slot: keyof Character['equipped']) => void;
  onUpdateNickname?: (newName: string) => void;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  character,
  resources,
  onAllocateStat,
  onChangeClass,
  onUnlockClass,
  onUnequipItem,
  onUpdateNickname,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(character.name || 'Aether Hero');

  const handleSaveNickname = () => {
    sound.playClick();
    const clean = nicknameInput.trim() || 'Aether Hero';
    if (onUpdateNickname) {
      onUpdateNickname(clean);
    }
    setIsEditingName(false);
  };
  const statInfo = [
    { key: 'strength' as const, name: 'Strength', icon: Sword, color: 'text-red-400', desc: '+Mining Yield & Physical DMG' },
    { key: 'agility' as const, name: 'Agility', icon: Zap, color: 'text-amber-400', desc: '+Crit Rate & Attack Speed' },
    { key: 'intelligence' as const, name: 'Intelligence', icon: Sparkles, color: 'text-cyan-400', desc: '+Arcane Dust & Spell Power' },
    { key: 'vitality' as const, name: 'Vitality', icon: Heart, color: 'text-emerald-400', desc: '+Max Health & Defense' },
    { key: 'luck' as const, name: 'Luck', icon: Trophy, color: 'text-purple-400', desc: '+Rare Drops & Double Harvest' },
  ];

  const classDescriptions: Record<HeroClass, { title: string; desc: string; icon: string }> = {
    warrior: { title: 'Warrior', desc: '+20% Ore Mining Yield & Higher Critical Damage', icon: '⚔️' },
    mage: { title: 'Archmage', desc: '+25% Arcane Dust Harvest & Spell Cooldown Reduction', icon: '🧙‍♂️' },
    ranger: { title: 'Sylvan Ranger', desc: '+30% Wood Harvesting Speed & Double Drop Chance', icon: '🏹' },
    alchemist: { title: 'Alchemist', desc: '+20% Gold Drops & Rare Gem Alchemy Yield', icon: '🧪' },
  };

  const unlockedClasses = character.unlockedClasses || ['warrior'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Top Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl border-2 border-amber-400 flex items-center justify-center text-3xl shadow-xl"
            style={{ backgroundColor: character.avatarColor }}
          >
            {classDescriptions[character.heroClass].icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 my-1">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    maxLength={20}
                    placeholder="Enter Hero Nickname..."
                    className="bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg transition-all"
                    title="Save Nickname"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setNicknameInput(character.name);
                      setIsEditingName(false);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-slate-100">{character.name}</h2>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setNicknameInput(character.name);
                      setIsEditingName(true);
                    }}
                    className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all text-xs flex items-center gap-1"
                    title="Change Nickname"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold">Edit Name</span>
                  </button>
                  <span className="bg-amber-950/80 text-amber-400 text-xs px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                    {character.title}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Class: <span className="text-amber-400 font-bold capitalize">{character.heroClass}</span> | Level {character.level}
            </p>
          </div>
        </div>

        {/* Unallocated Stat Points Banner */}
        {character.statPoints > 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 p-2.5 px-4 rounded-xl flex items-center gap-3 animate-pulse">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-black text-amber-300">
                {character.statPoints} Stat Points Available!
              </div>
              <div className="text-[10px] text-slate-300">Allocate below to empower your hero.</div>
            </div>
          </div>
        )}
      </div>

      {/* Hero Class Selector & Unlocks */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
          Hero Specialization Class Unlocks (5,000 Gold or 500 Gems)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(classDescriptions) as HeroClass[]).map((clsKey) => {
            const cls = classDescriptions[clsKey];
            const isSelected = character.heroClass === clsKey;
            const isUnlocked = unlockedClasses.includes(clsKey);
            const canGold = resources.gold >= 5000;
            const canGems = resources.gems >= 500;

            return (
              <div
                key={clsKey}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40'
                    : isUnlocked
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-2xl">{cls.icon}</div>
                    {isSelected && (
                      <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                        ACTIVE
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="text-[9px] font-bold uppercase text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-100">{cls.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">{cls.desc}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80">
                  {isUnlocked ? (
                    <button
                      disabled={isSelected}
                      onClick={() => {
                        sound.playClick();
                        onChangeClass(clsKey);
                      }}
                      className={`w-full py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 cursor-default'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{isSelected ? 'Active Class' : 'Select Class'}</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        disabled={!canGold}
                        onClick={() => {
                          if (onUnlockClass && canGold) {
                            sound.playSkillCast();
                            onUnlockClass(clsKey, 'gold');
                          }
                        }}
                        className={`w-full py-1 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                          canGold
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3 text-slate-950" />
                        <span>Unlock for 5,000 Gold</span>
                      </button>

                      <button
                        disabled={!canGems}
                        onClick={() => {
                          if (onUnlockClass && canGems) {
                            sound.playSkillCast();
                            onUnlockClass(clsKey, 'gems');
                          }
                        }}
                        className={`w-full py-1 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                          canGems
                            ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Gem className="w-3 h-3 text-slate-950" />
                        <span>Unlock for 500 Gems</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Attributes Allocator + Equipment Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Stat Allocator */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Hero Attributes
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Points: <span className="text-amber-300">{character.statPoints}</span>
            </span>
          </div>

          <div className="space-y-2.5">
            {statInfo.map((stat) => {
              const val = character.attributes[stat.key];
              const IconComp = stat.icon;

              return (
                <div
                  key={stat.key}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${stat.color}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{stat.name}</div>
                      <div className="text-[10px] text-slate-400">{stat.desc}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-slate-100">{val}</span>
                    <button
                      disabled={character.statPoints <= 0}
                      onClick={() => {
                        sound.playClick();
                        onAllocateStat(stat.key);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        character.statPoints > 0
                          ? 'bg-amber-500 text-slate-950 border-amber-400 hover:scale-110 active:scale-95 font-bold shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Equipped Gear */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
            Equipped Equipment & Companions
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { slot: 'weapon' as const, label: 'Weapon', icon: Sword },
              { slot: 'armor' as const, label: 'Armor', icon: Shirt },
              { slot: 'amulet' as const, label: 'Amulet', icon: Sparkles },
              { slot: 'pet' as const, label: 'Companion Pet', icon: Shield },
            ].map(({ slot, label, icon: SlotIcon }) => {
              const equipped = character.equipped[slot];

              return (
                <div
                  key={slot}
                  className={`p-3 rounded-xl border flex flex-col justify-between h-28 transition-all ${
                    equipped
                      ? 'bg-slate-900 border-amber-500/50 text-slate-200 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-600 border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase text-slate-400">{label}</span>
                    <SlotIcon className="w-3.5 h-3.5 text-slate-500" />
                  </div>

                  {equipped ? (
                    <div>
                      <div className="text-xs font-black text-amber-300 truncate">
                        {equipped.name} {equipped.enhancementLevel ? `+${equipped.enhancementLevel}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">{equipped.rarity} Quality</div>
                      <button
                        onClick={() => onUnequipItem(slot)}
                        className="mt-1 text-[9px] text-rose-400 hover:underline"
                      >
                        Unequip
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-slate-500 italic py-2">
                      Empty Slot
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hero Attack Power Summary */}
          <div className="mt-3 bg-gradient-to-r from-amber-950/60 to-rose-950/60 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase text-amber-400">⚔️ Total Hero Attack DMG</div>
              <div className="text-xs text-slate-400">Scaling from Weapon Rarity, Enhancement & Stats</div>
            </div>
            <div className="text-base font-black font-mono text-amber-300">
              {(() => {
                const totalEquippedBonuses = Object.values(character.equipped).reduce<Record<string, number>>((acc, rawItem) => {
                  const item = rawItem as EquipmentItem | undefined;
                  if (!item) return acc;
                  const levelMult = 1 + (item.enhancementLevel || 0) * 0.2;
                  Object.entries(item.statBonus).forEach(([k, v]) => {
                    if (typeof v === 'number') {
                      acc[k] = (acc[k] || 0) + Math.floor(v * levelMult);
                    }
                  });
                  return acc;
                }, {});

                const totalStr = character.attributes.strength + (totalEquippedBonuses['strength'] || 0);
                const totalAgi = character.attributes.agility + (totalEquippedBonuses['agility'] || 0);
                const totalInt = character.attributes.intelligence + (totalEquippedBonuses['intelligence'] || 0);

                let dmg = Math.floor(totalStr * 20 + totalAgi * 15 + totalInt * 12 + 500);

                if (character.equipped.weapon) {
                  const weapon = character.equipped.weapon;
                  const enhancement = weapon.enhancementLevel || 0;
                  let rarityMult = 1;
                  if (weapon.rarity === 'rare') rarityMult = 3;
                  if (weapon.rarity === 'epic') rarityMult = 10;
                  if (weapon.rarity === 'legendary') rarityMult = 50;
                  if (weapon.rarity === 'mythic') rarityMult = 200;
                  if (weapon.rarity === 'prismatic') rarityMult = 1000;

                  dmg = Math.floor(dmg * rarityMult * (1 + enhancement * 0.5));
                }

                return dmg.toLocaleString();
              })()} DMG
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
