import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EquipmentItem, Resources } from '../types';
import { EQUIPMENT_CATALOG } from '../data/gameData';
import {
  ANVIL_DIFFICULTY,
  STRIKE_SCORE,
  StrikeResult,
  createForgedItem,
  getQualityInfo,
  gradeStrike,
  qualityFromScore,
} from '../data/forgeData';
import { sound } from '../audio';
import { Hammer, Lock, Shield, Sword, Dog, Heart, Plus, Zap, Gem, Flame, RotateCcw, ScrollText, X } from 'lucide-react';

interface CraftingForgeProps {
  resources: Resources;
  heroLevel: number;
  inventory: EquipmentItem[];
  onCraftItem: (item: EquipmentItem) => boolean;
  onCraftHealingPotion?: (count: number) => void;
}

type RecipeCategory = 'all' | 'weapon' | 'armor' | 'accessory';
type ForgePhase = 'idle' | 'forging' | 'result';

const CATEGORIES: { id: RecipeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'accessory', label: 'Accessories' },
];

const RARITY_TEXT: Record<string, string> = {
  common: 'text-slate-300 border-slate-600',
  rare: 'text-blue-300 border-blue-500/60',
  epic: 'text-purple-300 border-purple-500/60',
  legendary: 'text-amber-300 border-amber-500/60',
  mythic: 'text-rose-300 border-rose-500/60',
  prismatic: 'text-fuchsia-300 border-fuchsia-400',
};

const STRIKE_LABEL: Record<StrikeResult, { text: string; className: string }> = {
  perfect: { text: 'PERFECT!', className: 'text-amber-300' },
  good: { text: 'Good', className: 'text-emerald-300' },
  miss: { text: 'Miss', className: 'text-rose-400' },
};

const SlotIcon: React.FC<{ slot: EquipmentItem['slot']; className?: string }> = ({ slot, className }) => {
  if (slot === 'weapon') return <Sword className={`${className} text-amber-400`} />;
  if (slot === 'armor') return <Shield className={`${className} text-emerald-400`} />;
  if (slot === 'pet') return <Dog className={`${className} text-purple-400`} />;
  return <Gem className={`${className} text-cyan-400`} />;
};

const randomZoneCenter = (zoneWidth: number) => {
  const min = zoneWidth / 2 + 4;
  const max = 100 - zoneWidth / 2 - 4;
  return min + Math.random() * (max - min);
};

export const CraftingForge: React.FC<CraftingForgeProps> = ({
  resources,
  heroLevel,
  inventory,
  onCraftItem,
  onCraftHealingPotion,
}) => {
  const [category, setCategory] = useState<RecipeCategory>('all');
  const [selectedId, setSelectedId] = useState<string>(EQUIPMENT_CATALOG[0].id);
  const [phase, setPhase] = useState<ForgePhase>('idle');
  const [strikes, setStrikes] = useState<StrikeResult[]>([]);
  const [zoneCenter, setZoneCenter] = useState<number>(50);
  const [markerPos, setMarkerPos] = useState<number>(0);
  const [hammerKey, setHammerKey] = useState<number>(0);
  const [forgedItem, setForgedItem] = useState<EquipmentItem | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);

  const markerRef = useRef(0);
  const directionRef = useRef(1);

  const recipes = useMemo(
    () =>
      EQUIPMENT_CATALOG.filter((item) => {
        if (category === 'all') return true;
        if (category === 'accessory') return item.slot !== 'weapon' && item.slot !== 'armor';
        return item.slot === category;
      }).sort((a, b) => a.levelReq - b.levelReq),
    [category]
  );

  const recipe = EQUIPMENT_CATALOG.find((i) => i.id === selectedId) || EQUIPMENT_CATALOG[0];
  const difficulty = ANVIL_DIFFICULTY[recipe.rarity];

  const canAfford = (cost: EquipmentItem['cost']) =>
    Object.entries(cost).every(([resKey, amount]) => (resources[resKey as keyof Resources] || 0) >= (amount || 0));

  const forgedCount = (recipeId: string) =>
    inventory.filter((inv) => (inv.baseId || inv.id) === recipeId).length;

  const affordable = canAfford(recipe.cost);
  const levelMet = heroLevel >= recipe.levelReq;

  // Marker sweeps back and forth across the strike bar while the blade is on the anvil
  useEffect(() => {
    if (phase !== 'forging') return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let next = markerRef.current + directionRef.current * difficulty.speed * dt;
      if (next >= 100) {
        next = 100;
        directionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        directionRef.current = 1;
      }
      markerRef.current = next;
      setMarkerPos(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, difficulty.speed]);

  const resetAnvil = () => {
    setPhase('idle');
    setStrikes([]);
    setForgedItem(null);
    setForgeError(null);
    markerRef.current = 0;
    directionRef.current = 1;
    setMarkerPos(0);
  };

  const selectRecipe = (id: string) => {
    if (phase === 'forging') return;
    sound.playClick();
    setSelectedId(id);
    resetAnvil();
  };

  const startForging = () => {
    if (!affordable || !levelMet) return;
    sound.playCraft();
    resetAnvil();
    setZoneCenter(randomZoneCenter(difficulty.zoneWidth));
    setPhase('forging');
  };

  const strike = () => {
    if (phase !== 'forging') return;

    const result = gradeStrike(markerRef.current, zoneCenter, difficulty.zoneWidth);
    sound.playAnvilStrike(result);
    setHammerKey((k) => k + 1);

    const nextStrikes = [...strikes, result];
    setStrikes(nextStrikes);

    if (nextStrikes.length < difficulty.strikes) {
      setZoneCenter(randomZoneCenter(difficulty.zoneWidth));
      return;
    }

    const avgScore = nextStrikes.reduce((sum, s) => sum + STRIKE_SCORE[s], 0) / nextStrikes.length;
    const item = createForgedItem(recipe, qualityFromScore(avgScore).id);

    if (onCraftItem(item)) {
      setForgedItem(item);
      setForgeError(null);
      sound.playLevelUp();
    } else {
      setForgedItem(null);
      setForgeError('The forge failed — you no longer have the required materials or level.');
    }
    setPhase('result');
  };

  // Space / Enter swings the hammer while forging
  const strikeRef = useRef(strike);
  strikeRef.current = strike;
  useEffect(() => {
    if (phase !== 'forging') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        strikeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const lastStrike = strikes[strikes.length - 1];
  const heatPct = (strikes.length / difficulty.strikes) * 100;
  const runningScore = strikes.length
    ? strikes.reduce((sum, s) => sum + STRIKE_SCORE[s], 0) / strikes.length
    : 0;
  const projectedQuality = qualityFromScore(runningScore);

  // Healing Potion Craft Cost Check
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
            <p className="text-xs text-slate-400">
              Pick a recipe, lay the materials on the anvil and strike in rhythm — better strikes forge stronger gear
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-4">
        {/* Recipe Book */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-slate-100">Recipe Book</h3>
          </div>

          <div className="flex gap-1 mb-3 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                disabled={phase === 'forging'}
                onClick={() => {
                  sound.playClick();
                  setCategory(c.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  category === c.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                } disabled:opacity-50`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[28rem] pr-1">
            {recipes.map((item) => {
              const itemAffordable = canAfford(item.cost);
              const itemLevelMet = heroLevel >= item.levelReq;
              const isSelected = item.id === selectedId;
              const count = forgedCount(item.id);

              return (
                <button
                  key={item.id}
                  disabled={phase === 'forging' && !isSelected}
                  onClick={() => selectRecipe(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/70'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                  } ${!itemLevelMet ? 'opacity-50' : ''} disabled:cursor-not-allowed`}
                >
                  <SlotIcon slot={item.slot} className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate">{item.name}</span>
                      {count > 0 && (
                        <span className="text-[9px] font-mono text-emerald-400 shrink-0">×{count}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                      <span className={`uppercase font-black ${RARITY_TEXT[item.rarity]?.split(' ')[0]}`}>
                        {item.rarity}
                      </span>
                      <span className="text-slate-500">Lvl {item.levelReq}</span>
                    </div>
                  </div>
                  {!itemLevelMet ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${itemAffordable ? 'bg-emerald-400' : 'bg-rose-500'}`}
                      title={itemAffordable ? 'Materials ready' : 'Missing materials'}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Anvil Workstation */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          {/* Selected recipe */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SlotIcon slot={recipe.slot} className="w-5 h-5 shrink-0" />
                <h3
                  className={`text-base font-black truncate ${
                    recipe.rarity === 'prismatic'
                      ? 'bg-gradient-to-r from-red-400 via-amber-300 via-emerald-300 via-cyan-300 to-fuchsia-400 text-transparent bg-clip-text'
                      : 'text-slate-100'
                  }`}
                >
                  {recipe.name}
                </h3>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${RARITY_TEXT[recipe.rarity]}`}
              >
                {recipe.rarity}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{recipe.description}</p>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
              {Object.entries(recipe.statBonus).map(([stat, val]) => (
                <span key={stat} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  +{val} {stat}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {Object.entries(recipe.cost).map(([res, costVal]) => {
                const playerHas = resources[res as keyof Resources] || 0;
                const enough = playerHas >= (costVal || 0);
                return (
                  <span
                    key={res}
                    className={`px-2 py-0.5 rounded border font-mono font-bold ${
                      enough
                        ? 'bg-slate-900 text-emerald-400 border-emerald-900'
                        : 'bg-rose-950/50 text-rose-400 border-rose-800'
                    }`}
                  >
                    {res.toUpperCase()}: {playerHas}/{costVal}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Anvil scene */}
          <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-orange-950/40 h-44 overflow-hidden flex items-end justify-center">
            {/* forge glow */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-24 rounded-full blur-3xl transition-opacity duration-300"
              style={{
                background: 'radial-gradient(circle, rgba(249,115,22,0.55), transparent 70%)',
                opacity: phase === 'forging' ? 0.5 + heatPct / 200 : phase === 'result' ? 0.6 : 0.2,
              }}
            />

            {/* hammer */}
            <div className="absolute left-1/2 top-2 -translate-x-[10%]">
              <div key={hammerKey} className={hammerKey > 0 ? 'animate-[hammer_0.28s_ease-out]' : ''} style={{ transformOrigin: '90% 90%' }}>
                <Hammer className="w-14 h-14 text-slate-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] -scale-x-100" />
              </div>
            </div>

            {/* strike feedback */}
            {lastStrike && phase === 'forging' && (
              <div
                key={`fb-${strikes.length}`}
                className={`absolute top-4 left-4 text-sm font-black animate-bounce ${STRIKE_LABEL[lastStrike].className}`}
              >
                {STRIKE_LABEL[lastStrike].text}
              </div>
            )}

            {/* sparks on a clean hit */}
            {lastStrike && lastStrike !== 'miss' && phase === 'forging' && (
              <div key={`sp-${strikes.length}`} className="absolute left-1/2 bottom-[4.6rem] -translate-x-1/2 pointer-events-none">
                {Array.from({ length: lastStrike === 'perfect' ? 10 : 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-amber-300 animate-[spark_0.5s_ease-out_forwards]"
                    style={{ ['--spark-angle' as string]: `${i * (360 / (lastStrike === 'perfect' ? 10 : 5))}deg` }}
                  />
                ))}
              </div>
            )}

            {/* anvil + ingot */}
            <svg viewBox="0 0 200 90" className="relative w-60 h-auto mb-1">
              {phase !== 'idle' && (
                <rect
                  x="62"
                  y="4"
                  width="70"
                  height="9"
                  rx="3"
                  fill={phase === 'result' ? '#94a3b8' : `hsl(${30 - heatPct * 0.25}, 95%, ${55 + heatPct * 0.15}%)`}
                  style={{ filter: phase === 'forging' ? 'drop-shadow(0 0 6px rgba(251,146,60,0.9))' : undefined }}
                />
              )}
              <path d="M10 14 H160 Q190 14 196 22 L150 26 Q140 30 138 40 L62 40 Q58 30 40 26 Q18 24 10 14 Z" fill="#475569" />
              <path d="M10 14 H160 Q190 14 196 22 L150 22 Q60 22 10 14 Z" fill="#64748b" />
              <rect x="70" y="40" width="60" height="22" fill="#334155" />
              <path d="M50 62 H150 L162 84 H38 Z" fill="#1e293b" />
            </svg>

            {forgedItem && phase === 'result' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-[1px]">
                <div className="text-center px-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Forged</p>
                  <p className={`text-lg font-black ${getQualityInfo(forgedItem.quality || 'standard').color}`}>
                    {forgedItem.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stats ×{getQualityInfo(forgedItem.quality || 'standard').statMultiplier} · sent to inventory
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Strike bar & controls */}
          {phase === 'forging' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">
                  Strike {Math.min(strikes.length + 1, difficulty.strikes)}/{difficulty.strikes}
                </span>
                <span className="text-slate-400">
                  Quality so far:{' '}
                  <span className={strikes.length ? projectedQuality.color : 'text-slate-500'}>
                    {strikes.length ? projectedQuality.label : '—'}
                  </span>
                </span>
              </div>

              <div className="relative h-7 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-500/30 border-x border-emerald-400/60"
                  style={{ left: `${zoneCenter - difficulty.zoneWidth / 2}%`, width: `${difficulty.zoneWidth}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-400/60"
                  style={{
                    left: `${zoneCenter - difficulty.zoneWidth * 0.18}%`,
                    width: `${difficulty.zoneWidth * 0.36}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-1 -ml-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                  style={{ left: `${markerPos}%` }}
                />
              </div>

              <div className="flex gap-1.5">
                {Array.from({ length: difficulty.strikes }).map((_, i) => {
                  const s = strikes[i];
                  return (
                    <span
                      key={i}
                      className={`flex-1 h-1.5 rounded-full ${
                        s === 'perfect' ? 'bg-amber-400' : s === 'good' ? 'bg-emerald-400' : s === 'miss' ? 'bg-rose-500' : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={strike}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                >
                  <Hammer className="w-4 h-4" /> STRIKE!
                  <span className="text-[10px] font-bold opacity-70 hidden sm:inline">(Space)</span>
                </button>
                <button
                  onClick={resetAnvil}
                  title="Take the materials off the anvil (nothing is consumed)"
                  className="px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Hit inside the green zone — the gold centre is a perfect strike. Materials are used once the last strike lands.
              </p>
            </div>
          )}

          {phase === 'idle' && (
            <button
              disabled={!affordable || !levelMet}
              onClick={startForging}
              className={`py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                affordable && levelMet
                  ? 'bg-amber-500 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-md'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {!levelMet ? (
                <>
                  <Lock className="w-4 h-4" /> Requires Level {recipe.levelReq}
                </>
              ) : !affordable ? (
                'Missing Materials'
              ) : (
                <>
                  <Flame className="w-4 h-4" /> Place on Anvil ({difficulty.strikes} strikes)
                </>
              )}
            </button>
          )}

          {phase === 'result' && (
            <div className="space-y-2">
              {forgeError && <p className="text-xs text-rose-400 font-bold text-center">{forgeError}</p>}
              <button
                onClick={affordable && levelMet ? startForging : resetAnvil}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700"
              >
                <RotateCcw className="w-4 h-4" /> {affordable && levelMet ? 'Forge Another' : 'Back to Anvil'}
              </button>
            </div>
          )}
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
    </div>
  );
};
