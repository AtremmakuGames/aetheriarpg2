import React from 'react';
import { EquipmentItem, Resources } from '../types';
import { EQUIPMENT_CATALOG } from '../data/gameData';
import { sound } from '../audio';
import { Hammer, Sparkles, Check, Lock, Shield, Sword, Dog, Heart, Plus, Zap } from 'lucide-react';

interface CraftingForgeProps {
  resources: Resources;
  heroLevel: number;
  inventory: EquipmentItem[];
  onCraftItem: (item: EquipmentItem) => void;
  onCraftHealingPotion?: (count: number) => void;
}

export const CraftingForge: React.FC<CraftingForgeProps> = ({
  resources,
  heroLevel,
  inventory,
  onCraftItem,
  onCraftHealingPotion,
}) => {
  const canAfford = (cost: EquipmentItem['cost']) => {
    for (const [resKey, amount] of Object.entries(cost)) {
      if ((resources[resKey as keyof Resources] || 0) < (amount || 0)) {
        return false;
      }
    }
    return true;
  };

  const isAlreadyOwned = (itemId: string) => {
    return inventory.some((inv) => inv.id === itemId);
  };

  // Healing Potion Craft Cost Check
  const potionCost = { herbs: 15, arcaneDust: 10, gold: 50 };
  const canAfford1Potion =
    resources.herbs >= 15 && resources.arcaneDust >= 10 && resources.gold >= 50;
  const canAfford5Potions =
    resources.herbs >= 75 && resources.arcaneDust >= 50 && resources.gold >= 250;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Hammer className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-black text-slate-100">Blacksmith Forge & Alchemy Lab</h2>
            <p className="text-xs text-slate-400">Forge epic weapons, prismatic dimension gear, and alchemy healing potions</p>
          </div>
        </div>
      </div>

      {/* Alchemy Lab - Healing Potion Crafting Section */}
      <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-400">
              <Heart className="w-6 h-6 fill-rose-500 animate-pulse" />
            </div>
            <span className="absolute -top-2 -right-2 bg-rose-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full shadow border border-slate-900">
              {resources.healingPotions}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              Aether Healing Potion (+300 HP)
              <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-mono">
                Stock: {resources.healingPotions}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly restores 300 Hero HP during battle. Usable anytime from abilities bar or AFK tab.
            </p>

            <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-mono font-bold">
              <span className={resources.herbs >= 15 ? 'text-emerald-400' : 'text-rose-400'}>
                HERBS: {resources.herbs}/15
              </span>
              <span className="text-slate-600">•</span>
              <span className={resources.arcaneDust >= 10 ? 'text-emerald-400' : 'text-rose-400'}>
                ARCANE DUST: {resources.arcaneDust}/10
              </span>
              <span className="text-slate-600">•</span>
              <span className={resources.gold >= 50 ? 'text-emerald-400' : 'text-rose-400'}>
                GOLD: {resources.gold}/50
              </span>
            </div>
          </div>
        </div>

        {/* Craft Potion Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={!canAfford1Potion}
            onClick={() => {
              if (onCraftHealingPotion && canAfford1Potion) {
                sound.playCraft();
                onCraftHealingPotion(1);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              canAfford1Potion
                ? 'bg-rose-500 text-slate-950 hover:scale-105 active:scale-95 shadow-md'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Craft 1 Potion</span>
          </button>

          <button
            disabled={!canAfford5Potions}
            onClick={() => {
              if (onCraftHealingPotion && canAfford5Potions) {
                sound.playCraft();
                onCraftHealingPotion(5);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              canAfford5Potions
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 hover:scale-105 active:scale-95 shadow-md'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Craft 5x Potions</span>
          </button>
        </div>
      </div>

      {/* Equipment Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EQUIPMENT_CATALOG.map((item) => {
          const affordable = canAfford(item.cost);
          const levelMet = heroLevel >= item.levelReq;
          const owned = isAlreadyOwned(item.id);

          const rarityColors: Record<string, string> = {
            common: 'border-slate-700 bg-slate-900',
            rare: 'border-blue-500/50 bg-blue-950/20 text-blue-300',
            epic: 'border-purple-500/50 bg-purple-950/20 text-purple-300',
            legendary: 'border-amber-500/60 bg-amber-950/20 text-amber-300',
            mythic: 'border-rose-500/60 bg-rose-950/20 text-rose-300',
            prismatic:
              'border-2 border-fuchsia-400 bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 text-fuchsia-300 shadow-[0_0_20px_rgba(236,72,153,0.4)]',
          };

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                rarityColors[item.rarity] || 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.slot === 'weapon' && <Sword className="w-4 h-4 text-amber-400" />}
                    {item.slot === 'armor' && <Shield className="w-4 h-4 text-emerald-400" />}
                    {item.slot === 'pet' && <Dog className="w-4 h-4 text-purple-400" />}
                    <h3
                      className={`text-sm font-black ${
                        item.rarity === 'prismatic'
                          ? 'bg-gradient-to-r from-red-400 via-amber-300 via-emerald-300 via-cyan-300 to-fuchsia-400 text-transparent bg-clip-text animate-pulse'
                          : 'text-slate-100'
                      }`}
                    >
                      {item.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      item.rarity === 'prismatic'
                        ? 'bg-gradient-to-r from-red-600 via-purple-600 to-sky-600 text-white border-fuchsia-400 shadow-[0_0_10px_rgba(236,72,153,0.6)]'
                        : 'border-slate-700'
                    }`}
                  >
                    {item.rarity}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1.5">{item.description}</p>

                {/* Resource Cost List */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {Object.entries(item.cost).map(([res, costVal]) => {
                    const playerHas = resources[res as keyof Resources] || 0;
                    const enough = playerHas >= (costVal || 0);

                    return (
                      <span
                        key={res}
                        className={`px-2 py-0.5 rounded border font-mono font-bold ${
                          enough
                            ? 'bg-slate-950 text-emerald-400 border-emerald-900'
                            : 'bg-rose-950/50 text-rose-400 border-rose-800'
                        }`}
                      >
                        {res.toUpperCase()}: {playerHas}/{costVal}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Craft Action Button */}
              <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Req: Level {item.levelReq}
                </span>

                {owned ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800">
                    <Check className="w-3.5 h-3.5" /> Forged
                  </span>
                ) : (
                  <button
                    disabled={!affordable || !levelMet}
                    onClick={() => {
                      if (affordable && levelMet) {
                        sound.playCraft();
                        onCraftItem(item);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      affordable && levelMet
                        ? 'bg-amber-500 text-slate-950 hover:scale-105 active:scale-95 shadow-md font-extrabold'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {!levelMet ? (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Locked (Lvl {item.levelReq})
                      </>
                    ) : !affordable ? (
                      'Need Resources'
                    ) : (
                      <>
                        <Hammer className="w-3.5 h-3.5" /> Forge Now
                      </>
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

