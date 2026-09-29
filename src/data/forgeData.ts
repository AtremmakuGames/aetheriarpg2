import { EquipmentItem, ForgeQuality, Rarity } from '../types';

export interface ForgeQualityInfo {
  id: ForgeQuality;
  label: string;
  minScore: number; // average strike score (0-100) needed
  statMultiplier: number;
  color: string;
}

// Ordered from best to worst so the first matching threshold wins
export const FORGE_QUALITIES: ForgeQualityInfo[] = [
  { id: 'masterwork', label: 'Masterwork', minScore: 90, statMultiplier: 1.6, color: 'text-amber-300' },
  { id: 'superior', label: 'Superior', minScore: 72, statMultiplier: 1.35, color: 'text-fuchsia-300' },
  { id: 'fine', label: 'Fine', minScore: 50, statMultiplier: 1.15, color: 'text-sky-300' },
  { id: 'standard', label: 'Standard', minScore: 25, statMultiplier: 1.0, color: 'text-slate-200' },
  { id: 'crude', label: 'Crude', minScore: 0, statMultiplier: 0.8, color: 'text-stone-400' },
];

export const getQualityInfo = (quality: ForgeQuality): ForgeQualityInfo =>
  FORGE_QUALITIES.find((q) => q.id === quality) || FORGE_QUALITIES[3];

export const qualityFromScore = (score: number): ForgeQualityInfo =>
  FORGE_QUALITIES.find((q) => score >= q.minScore) || FORGE_QUALITIES[FORGE_QUALITIES.length - 1];

// Anvil difficulty per rarity: number of hammer strikes, sweet-spot width (% of bar) and marker speed (% per second)
export const ANVIL_DIFFICULTY: Record<Rarity, { strikes: number; zoneWidth: number; speed: number }> = {
  common: { strikes: 3, zoneWidth: 30, speed: 70 },
  rare: { strikes: 4, zoneWidth: 26, speed: 85 },
  epic: { strikes: 5, zoneWidth: 22, speed: 100 },
  legendary: { strikes: 6, zoneWidth: 18, speed: 115 },
  mythic: { strikes: 7, zoneWidth: 15, speed: 130 },
  prismatic: { strikes: 8, zoneWidth: 13, speed: 145 },
};

export type StrikeResult = 'perfect' | 'good' | 'miss';

export const STRIKE_SCORE: Record<StrikeResult, number> = { perfect: 100, good: 60, miss: 0 };

// Grade a hammer strike by the marker's distance from the sweet-spot centre
export const gradeStrike = (markerPos: number, zoneCenter: number, zoneWidth: number): StrikeResult => {
  const dist = Math.abs(markerPos - zoneCenter);
  if (dist <= zoneWidth * 0.18) return 'perfect';
  if (dist <= zoneWidth / 2) return 'good';
  return 'miss';
};

// Build an inventory item from a catalog recipe at the given forge quality
export const createForgedItem = (recipe: EquipmentItem, quality: ForgeQuality): EquipmentItem => {
  const info = getQualityInfo(quality);
  const statBonus: Record<string, number> = {};
  Object.entries(recipe.statBonus).forEach(([k, v]) => {
    statBonus[k] = Math.max(1, Math.round((v || 0) * info.statMultiplier));
  });

  return {
    ...recipe,
    id: `${recipe.id}__${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    baseId: recipe.id,
    quality,
    name: quality === 'standard' ? recipe.name : `${info.label} ${recipe.name}`,
    statBonus,
    sellPriceGold: Math.round((recipe.sellPriceGold || 50) * info.statMultiplier),
    enhancementLevel: 0,
  };
};
