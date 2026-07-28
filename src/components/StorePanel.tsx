import React, { useState } from 'react';
import { Character, EquipmentItem, Resources } from '../types';
import { sound } from '../audio';
import {
  ShoppingBag,
  Coins,
  Gem,
  Zap,
  Sparkles,
  Shield,
  Sword,
  Apple,
  TrendingUp,
  Check,
  Utensils,
  Award,
} from 'lucide-react';

interface StorePanelProps {
  resources: Resources;
  character: Character;
  onBuyPrismaticGear: (item: EquipmentItem) => void;
  onExchangeGemsForGold: (gemsAmount: number, goldAmount: number) => void;
  onBuyExpPotion: () => void;
  onBuyFood: (foodName: string, hungerRestore: number, goldCost: number, gemsCost: number, hpHeal?: number) => void;
}

export const StorePanel: React.FC<StorePanelProps> = ({
  resources,
  character,
  onBuyPrismaticGear,
  onExchangeGemsForGold,
  onBuyExpPotion,
  onBuyFood,
}) => {
  const [activeTab, setActiveTab] = useState<'gear' | 'currency' | 'potions' | 'food'>('gear');
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null);

  const showMsg = (text: string) => {
    setPurchaseMsg(text);
    setTimeout(() => setPurchaseMsg(null), 3000);
  };

  // Prismatic Merchant Equipment Items (Bought with Gold)
  const PRISMATIC_MERCHANT_ITEMS: EquipmentItem[] = [
    {
      id: 'prismatic_merchant_blade',
      name: 'Prismatic Merchant Sword',
      slot: 'weapon',
      rarity: 'prismatic',
      description: 'A glowing prismatic blade forged by royal traders. Prismatic tier quality, moderately balanced stats.',
      statBonus: { strength: 45, agility: 30, extraYield: 18, critRate: 12 },
      cost: { gold: 25000 },
      levelReq: 15,
      iconName: 'Sword',
      sellPriceGold: 10000,
    },
    {
      id: 'prismatic_merchant_aegis',
      name: 'Prismatic Merchant Cuirass',
      slot: 'armor',
      rarity: 'prismatic',
      description: 'Polished merchant armor infused with rainbow light. Sturdy vitality and gathering boost.',
      statBonus: { vitality: 55, strength: 25, gatheringSpeed: 15 },
      cost: { gold: 25000 },
      levelReq: 15,
      iconName: 'Shield',
      sellPriceGold: 10000,
    },
    {
      id: 'prismatic_merchant_pendant',
      name: 'Prismatic Merchant Talisman',
      slot: 'amulet',
      rarity: 'prismatic',
      description: 'A sparkling gem pendant that enhances intelligence and luck.',
      statBonus: { intelligence: 40, luck: 35, critRate: 15 },
      cost: { gold: 20000 },
      levelReq: 12,
      iconName: 'Sparkles',
      sellPriceGold: 8000,
    },
  ];

  // Currency exchange bundles
  const CURRENCY_BUNDLES = [
    { gems: 100, gold: 10000, title: 'Pouches of Gold', badge: 'BASIC' },
    { gems: 500, gold: 60000, title: 'Chest of Treasure', badge: '+20% EXTRA' },
    { gems: 2000, gold: 300000, title: 'Royal Vault Deposit', badge: 'BEST VALUE' },
  ];

  // Food Items for Hunger System
  const FOOD_ITEMS = [
    {
      name: 'Fresh Bakery Bread 🍞',
      hunger: 25,
      goldCost: 300,
      gemsCost: 0,
      heal: 50,
      desc: 'Warm baked loaf. Restores +25 Hunger & +50 HP.',
    },
    {
      name: 'Roasted Wild Steak 🥩',
      hunger: 55,
      goldCost: 800,
      gemsCost: 0,
      heal: 150,
      desc: 'Juicy roasted meat. Restores +55 Hunger & +150 HP.',
    },
    {
      name: 'Golden Enchanted Apple 🍏',
      hunger: 100,
      goldCost: 0,
      gemsCost: 50,
      heal: 999,
      desc: 'Divine golden apple! Restores 100% Hunger & Full Health.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 rounded-2xl shadow-lg text-slate-950">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              Merchant Market & Store
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                ROYAL SHOP
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Purchase Prismatic gear with Gold, convert Gems into Gold, Level Up instantly, and replenish Hunger supplies
            </p>
          </div>
        </div>

        {/* Currency Display Header */}
        <div className="flex items-center gap-3 bg-slate-950 p-2.5 px-4 rounded-xl border border-slate-800 font-mono">
          <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
            <Coins className="w-4 h-4" />
            <span>{resources.gold.toLocaleString()} Gold</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-black text-sm">
            <Gem className="w-4 h-4" />
            <span>{resources.gems.toLocaleString()} Gems</span>
          </div>
        </div>
      </div>

      {/* Floating Notice Banner */}
      {purchaseMsg && (
        <div className="bg-amber-950/90 border border-amber-500/50 text-amber-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{purchaseMsg}</span>
        </div>
      )}

      {/* Category Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('gear')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'gear'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Prismatic Gear (Gold)</span>
        </button>

        <button
          onClick={() => setActiveTab('currency')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'currency'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Gold Exchange (Gems)</span>
        </button>

        <button
          onClick={() => setActiveTab('potions')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'potions'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>EXP Potion (+1 Level)</span>
        </button>

        <button
          onClick={() => setActiveTab('food')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'food'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Food Supplies (Hunger)</span>
        </button>
      </div>

      {/* Tab 1: Prismatic Gear bought with Gold */}
      {activeTab === 'gear' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-black text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Prismatic Merchant Armory (Purchased with Gold)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Prismatic quality tier gear available directly in the Royal Shop. Moderately balanced combat bonuses for budget adventurer heroes!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRISMATIC_MERCHANT_ITEMS.map((item) => {
              const goldPrice = item.cost.gold || 0;
              const canAfford = resources.gold >= goldPrice;

              return (
                <div
                  key={item.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-purple-900/40 hover:border-purple-500/60 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group shadow-lg"
                >
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black font-mono uppercase bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                        {item.rarity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">Req. Lvl {item.levelReq}</span>
                    </div>

                    <h4 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                      {item.slot === 'weapon' ? (
                        <Sword className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-indigo-400" />
                      )}
                      <span>{item.name}</span>
                    </h4>

                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                      {Object.entries(item.statBonus).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400 capitalize">{k}:</span>
                          <span className="text-emerald-400 font-bold">+{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-amber-400 font-mono font-bold text-xs">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{goldPrice.toLocaleString()} Gold</span>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        sound.playCraft();
                        onBuyPrismaticGear(item);
                        showMsg(`🛍️ Purchased ${item.name}! Added to Inventory.`);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:scale-105 active:scale-95 shadow-md'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      Buy Gear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Gold Exchange for Gems */}
      {activeTab === 'currency' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Royal Treasury Gold Exchange
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Exchange your rare Gems directly into instant Gold reserves to fund blacksmith crafting, shop purchases, and upgrades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CURRENCY_BUNDLES.map((bundle, idx) => {
              const canAfford = resources.gems >= bundle.gems;

              return (
                <div
                  key={idx}
                  className="bg-slate-950 p-5 rounded-2xl border border-amber-900/40 hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30 w-max">
                    {bundle.badge}
                  </span>

                  <div>
                    <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <span>{bundle.title}</span>
                    </h4>

                    <div className="my-3 text-2xl font-mono font-black text-amber-400 flex items-center gap-1">
                      <span>+{bundle.gold.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">GOLD</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-xs">
                      <Gem className="w-4 h-4" />
                      <span>{bundle.gems} Gems</span>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        sound.playLevelUp();
                        onExchangeGemsForGold(bundle.gems, bundle.gold);
                        showMsg(`💰 Exchanged ${bundle.gems} Gems for +${bundle.gold.toLocaleString()} Gold!`);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:scale-105 active:scale-95 shadow-lg'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      Exchange
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: EXP Potion (+1 Level for 750 Gems) */}
      {activeTab === 'potions' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-cyan-900/40 space-y-4 max-w-xl mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center text-slate-950 shadow-xl">
            <TrendingUp className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-100">Elixir of Instant Hero Ascension</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Consumes 750 Gems to instantly raise your character level by <span className="text-cyan-400 font-bold">+1 Level</span>! Instantly grants Stat Points & Skill Points!
            </p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-xs flex justify-around text-slate-300">
            <div>
              <span>Current Level:</span> <span className="text-cyan-400 font-bold">Lvl {character.level}</span>
            </div>
            <div>
              <span>Next Level:</span> <span className="text-emerald-400 font-bold">Lvl {character.level + 1}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              disabled={resources.gems < 750}
              onClick={() => {
                sound.playLevelUp();
                onBuyExpPotion();
                showMsg(`✨ Drank Elixir! Hero Level Up! (+1 Level)`);
              }}
              className={`w-full py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                resources.gems >= 750
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 text-slate-950 hover:scale-102 active:scale-98 shadow-xl shadow-cyan-950/50'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Gem className="w-4 h-4" />
              <span>BUY EXP POTION (750 GEMS)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Food Supplies for Hunger System */}
      {activeTab === 'food' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Food & Hunger Supplies
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Eat food to keep your Hero's Hunger bar filled! High hunger maintains 100% full combat and gathering efficiency.
              </p>
            </div>
            <div className="text-right font-mono text-xs bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400">Current Hunger:</span>
              <div className="text-emerald-400 font-bold text-sm">{resources.hunger} / 100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FOOD_ITEMS.map((food, idx) => {
              const canAffordGold = food.goldCost > 0 && resources.gold >= food.goldCost;
              const canAffordGems = food.gemsCost > 0 && resources.gems >= food.gemsCost;
              const canBuy = canAffordGold || canAffordGems;

              return (
                <div
                  key={idx}
                  className="bg-slate-950 p-5 rounded-2xl border border-emerald-900/40 hover:border-emerald-500/60 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                      <span>{food.name}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{food.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                      {food.goldCost > 0 ? (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>{food.goldCost} Gold</span>
                        </>
                      ) : (
                        <>
                          <Gem className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-cyan-400">{food.gemsCost} Gems</span>
                        </>
                      )}
                    </div>

                    <button
                      disabled={!canBuy}
                      onClick={() => {
                        sound.playCraft();
                        onBuyFood(food.name, food.hunger, food.goldCost, food.gemsCost, food.heal);
                        showMsg(`🥖 Ate ${food.name}! Restored +${food.hunger} Hunger.`);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        canBuy
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:scale-105 active:scale-95 shadow-lg'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      Eat Food
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
