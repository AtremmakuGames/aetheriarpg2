import React, { useState } from 'react';
import { Character, EquipmentItem, Resources } from '../types';
import { sound } from '../audio';
import { STARTER_INVENTORY } from '../data/gameData';
import {
  Briefcase,
  Shield,
  Sword,
  Shirt,
  Sparkles,
  Dog,
  Compass,
  Coins,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowUpRight,
  Filter,
  Package,
  Info,
  Zap,
} from 'lucide-react';

interface InventoryPanelProps {
  character: Character;
  resources?: Resources;
  inventory: EquipmentItem[];
  onEquipItem: (item: EquipmentItem) => void;
  onUnequipItem: (slot: keyof Character['equipped']) => void;
  onSellItem: (item: EquipmentItem) => void;
  onUpgradeItem?: (item: EquipmentItem) => void;
  onAddStarterItems?: () => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  character,
  resources,
  inventory,
  onEquipItem,
  onUnequipItem,
  onSellItem,
  onUpgradeItem,
  onAddStarterItems,
}) => {
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rarity' | 'level'>('rarity');

  const slotIcons: Record<string, React.FC<{ className?: string }>> = {
    weapon: Sword,
    armor: Shirt,
    amulet: Sparkles,
    relic: Compass,
    pet: Dog,
  };

  const rarityColors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    common: { border: 'border-slate-700', bg: 'bg-slate-900', text: 'text-slate-300', badge: 'bg-slate-800 text-slate-300' },
    rare: { border: 'border-blue-500/60', bg: 'bg-blue-950/30', text: 'text-blue-400', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
    epic: { border: 'border-purple-500/60', bg: 'bg-purple-950/30', text: 'text-purple-400', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
    legendary: { border: 'border-amber-500/70', bg: 'bg-amber-950/30', text: 'text-amber-400', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
    mythic: { border: 'border-rose-500/80', bg: 'bg-rose-950/40', text: 'text-rose-400', badge: 'bg-rose-950 text-rose-300 border-rose-800' },
    prismatic: {
      border: 'border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(236,72,153,0.5)]',
      bg: 'bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950',
      text: 'bg-gradient-to-r from-red-400 via-amber-300 via-emerald-300 via-cyan-300 to-fuchsia-400 text-transparent bg-clip-text font-black animate-pulse',
      badge: 'bg-gradient-to-r from-red-600 via-purple-600 to-sky-600 text-white font-black border-fuchsia-400 shadow-[0_0_10px_rgba(236,72,153,0.6)]',
    },
  };

  // Filter items
  const filteredInventory = inventory.filter((item) => {
    if (selectedSlotFilter !== 'all' && item.slot !== selectedSlotFilter) return false;
    return true;
  });

  // Calculate combined equipped bonuses
  const totalEquippedBonuses = Object.values(character.equipped).reduce((acc, rawItem) => {
    const item = rawItem as EquipmentItem | undefined;
    if (!item) return acc;
    for (const [stat, val] of Object.entries(item.statBonus)) {
      if (typeof val === 'number') {
        acc[stat] = (acc[stat] || 0) + val;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
              Equipment Inventory
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                {inventory.length} Items
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage, equip, and compare hero gear items to maximize mining & stat multipliers.
            </p>
          </div>
        </div>

        {/* Claim Starter Gear Button if inventory is low or empty */}
        {inventory.length < 2 && onAddStarterItems && (
          <button
            onClick={() => {
              sound.playCraft();
              onAddStarterItems();
            }}
            className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-transform transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Claim Starter Equipment Kit!</span>
          </button>
        )}
      </div>

      {/* Currently Equipped Gear Rack */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Active Equipped Gear
          </h3>
          {Object.keys(totalEquippedBonuses).length > 0 && (
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              Total Bonus: {Object.entries(totalEquippedBonuses).map(([k, v]) => `+${v} ${k}`).join(' | ')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { slot: 'weapon' as const, label: 'Weapon', icon: Sword },
            { slot: 'armor' as const, label: 'Armor', icon: Shirt },
            { slot: 'amulet' as const, label: 'Amulet', icon: Sparkles },
            { slot: 'relic' as const, label: 'Relic', icon: Compass },
            { slot: 'pet' as const, label: 'Companion Pet', icon: Dog },
          ].map(({ slot, label, icon: SlotIcon }) => {
            const item = character.equipped[slot];
            const rStyle = item ? rarityColors[item.rarity] : null;

            return (
              <div
                key={slot}
                className={`p-3 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all relative ${
                  item
                    ? `${rStyle?.bg} ${rStyle?.border} shadow-lg ring-1 ring-amber-500/20`
                    : 'bg-slate-950/60 border-slate-800/80 border-dashed text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase text-slate-400 text-[10px]">{label}</span>
                  <SlotIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>

                {item ? (
                  <div className="mt-1">
                    <div className={`text-xs font-black truncate ${rStyle?.text}`}>{item.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize flex items-center justify-between mt-0.5">
                      <span>{item.rarity}</span>
                      <span className="text-amber-400 font-bold">Lvl {item.levelReq}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => {
                          sound.playClick();
                          onUnequipItem(slot);
                        }}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        Unequip
                      </button>
                      <span className="text-[9px] font-mono text-emerald-400">
                        {Object.entries(item.statBonus)[0] ? `+${Object.entries(item.statBonus)[0][1]} ${Object.entries(item.statBonus)[0][0]}` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[10px] text-slate-500 italic py-3">
                    Empty Slot
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-black uppercase text-slate-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Gear' },
            { id: 'weapon', label: 'Weapons' },
            { id: 'armor', label: 'Armor' },
            { id: 'amulet', label: 'Amulets' },
            { id: 'relic', label: 'Relics' },
            { id: 'pet', label: 'Pets' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                sound.playClick();
                setSelectedSlotFilter(id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedSlotFilter === id
                  ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inventory Items Grid */}
      {filteredInventory.length === 0 ? (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-8 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">No equipment items in this category</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Craft new weapons and armor in the Blacksmith Forge or claim starter items to equip your hero.
          </p>
          {onAddStarterItems && (
            <button
              onClick={() => {
                sound.playCraft();
                onAddStarterItems();
              }}
              className="mt-2 bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Get Starter Gear</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredInventory.map((item, idx) => {
            const isEquipped = character.equipped[item.slot]?.id === item.id;
            const rStyle = rarityColors[item.rarity];
            const canEquip = character.level >= item.levelReq;
            const SlotIcon = slotIcons[item.slot] || Shield;

            return (
              <div
                key={`${item.id}-${idx}`}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all relative ${rStyle.bg} ${rStyle.border} ${
                  isEquipped ? 'ring-2 ring-emerald-500/80 shadow-xl' : 'hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${rStyle.badge}`}>
                      {item.rarity} {item.slot}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Req. Lvl {item.levelReq}
                    </span>
                  </div>

                  <h4 className={`text-sm font-black ${rStyle.text} flex items-center justify-between gap-1.5`}>
                    <div className="flex items-center gap-1.5">
                      <SlotIcon className="w-4 h-4 text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                    {item.enhancementLevel && item.enhancementLevel > 0 ? (
                      <span className="text-xs font-mono font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                        +{item.enhancementLevel}
                      </span>
                    ) : null}
                  </h4>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Stat Bonuses */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    {Object.entries(item.statBonus).map(([sKey, val]) => (
                      <span key={sKey} className="bg-slate-950 text-emerald-400 px-2 py-0.5 rounded border border-slate-800">
                        +{val} {sKey}
                      </span>
                    ))}
                  </div>

                  {/* Upgrade Gear Action Button */}
                  {onUpgradeItem && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {(() => {
                        const curLevel = item.enhancementLevel || 0;
                        const upgradeCost = 300 * (curLevel + 1);
                        const canUpgradeGold = (resources?.gold || 0) >= upgradeCost;

                        return (
                          <button
                            disabled={!canUpgradeGold}
                            onClick={() => {
                              sound.playCraft();
                              onUpgradeItem(item);
                            }}
                            className={`w-full py-1 px-2.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-between ${
                              canUpgradeGold
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-300" /> Upgrade +{curLevel + 1}
                            </span>
                            <span className="font-mono text-amber-300">{upgradeCost} Gold</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                  {isEquipped ? (
                    <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Equipped</span>
                    </div>
                  ) : (
                    <button
                      disabled={!canEquip}
                      onClick={() => {
                        sound.playClick();
                        onEquipItem(item);
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        canEquip
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{canEquip ? 'Equip Gear' : `Lvl ${item.levelReq} Req.`}</span>
                    </button>
                  )}

                  {!isEquipped && (
                    <button
                      onClick={() => {
                        sound.playCraft();
                        onSellItem(item);
                      }}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-all flex items-center gap-1 text-[10px]"
                      title={`Sell for +${item.sellPriceGold || 50} Gold`}
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>+{item.sellPriceGold || 50}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
