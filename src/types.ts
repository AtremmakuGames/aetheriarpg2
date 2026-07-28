export type HeroClass = 'warrior' | 'mage' | 'ranger' | 'alchemist';

export interface Attributes {
  strength: number;      // Increases Physical Damage & Mining Yield
  agility: number;       // Increases Attack Speed & Critical Strike Rate
  intelligence: number;  // Increases Skill Damage & Arcane Dust Yield
  vitality: number;      // Increases Max HP & Defense
  luck: number;          // Increases Rare Drop Chance & Double Harvest Rate
  gatheringSpeed: number;// Reduces gathering time
  magicPower: number;    // Boosts active spell potency
}

export interface Character {
  name: string;
  heroClass: HeroClass;
  unlockedClasses: HeroClass[];
  level: number;
  xp: number;
  xpToNextLevel: number;
  statPoints: number;
  skillPoints: number;
  attributes: Attributes;
  equipped: {
    weapon?: EquipmentItem;
    armor?: EquipmentItem;
    amulet?: EquipmentItem;
    relic?: EquipmentItem;
    pet?: EquipmentItem;
  };
  title: string;
  avatarColor: string;
}

export type ResourceType = 
  | 'wood' 
  | 'stone' 
  | 'iron' 
  | 'mythril' 
  | 'crystal' 
  | 'arcaneDust' 
  | 'flameGem' 
  | 'dragonScale' 
  | 'voidShard'
  | 'herbs'
  | 'ruby'
  | 'emerald'
  | 'obsidian'
  | 'starlight'
  | 'ether'
  | 'gold' 
  | 'gems'
  | 'netherEssence'
  | 'shadowScale'
  | 'darkMatter'
  | 'singularityDust'
  | 'cosmicOrb';

export interface Resources {
  wood: number;
  stone: number;
  iron: number;
  mythril: number;
  crystal: number;
  arcaneDust: number;
  flameGem: number;
  dragonScale: number;
  voidShard: number;
  herbs: number;
  ruby: number;
  emerald: number;
  obsidian: number;
  starlight: number;
  ether: number;
  gold: number;
  gems: number;
  netherEssence: number;
  shadowScale: number;
  darkMatter: number;
  singularityDust: number;
  cosmicOrb: number;
  healingPotions: number;
  afkFarmerCharges: number;
  hunger: number; // 0 - 100
  hoeTier: number; // 1 = Wood, 2 = Iron, 3 = Mythril, 4 = Dragon, 5 = Prismatic
}

export interface FarmCropPlot {
  id: string;
  cropType: 'wheat' | 'carrot' | 'golden_berry' | 'starflower';
  name: string;
  growthTimeSec: number;
  plantedAt: number | null; // timestamp
  ready: boolean;
  goldReward: number;
  gemsReward: number;
  emoji: string;
}

export interface HoeQuest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardGems: number;
  completed: boolean;
  type: 'plant' | 'upgrade_hoe' | 'defeat_boss' | 'eat_food';
}

export interface FarmBoss {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  currentHp: number;
  attackDmg: number;
  rewardGold: number;
  rewardGems: number;
  level: number;
}

export interface GatheringNode {
  id: string;
  name: string;
  type: ResourceType;
  maxHp: number;
  currentHp: number;
  resourceYield: number;
  bonusYieldItem?: ResourceType;
  bonusChance: number;
  respawnTimeMs: number;
  reqLevel: number;
  color: string;
  iconName: string;
  x: number; // percentage on canvas
  y: number; // percentage on canvas
  isMob?: boolean;
  mobAttack?: number;
  mobLevel?: number;
  mobEmoji?: string;
  isPortal?: boolean;
}

export interface GatheringZone {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bgGradient: string;
  bgPattern: string;
  nodes: (Omit<GatheringNode, 'x' | 'y' | 'currentHp'> & { defaultX?: number; defaultY?: number })[];
  zoneColor: string;
  isNetherZone?: boolean;
  isPortalEntry?: boolean;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'prismatic';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'amulet' | 'relic' | 'pet';
  rarity: Rarity;
  description: string;
  statBonus: Partial<Attributes> & { extraYield?: number; critRate?: number };
  cost: Partial<Resources>;
  levelReq: number;
  iconName: string;
  sellPriceGold?: number;
  enhancementLevel?: number;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  category: 'gathering' | 'combat' | 'magic' | 'utility';
  tier: number;
  costPoints: number;
  unlocked: boolean;
  reqSkillId?: string;
  iconName: string;
  cooldownSec: number;
  currentCooldown: number;
  manaCost: number;
  effect: {
    type: 'burst_harvest' | 'meteor_strike' | 'overcharge' | 'time_warp' | 'gold_frenzy' | 'passive_buff';
    value: number;
    statType?: keyof Attributes;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'level' | 'resources' | 'skills' | 'crafting' | 'cloud';
  currentProgress: number;
  targetProgress: number;
  rewardGems: number;
  rewardXP: number;
  unlocked: boolean;
  iconName: string;
}

export interface LeaderboardEntry {
  id: string;
  syncCode: string;
  playerName: string;
  heroClass: HeroClass;
  level: number;
  combatPower: number;
  totalResourcesHarvested: number;
  achievementsUnlocked: number;
  updatedAt: string;
  isUser?: boolean;
}

export interface CloudSaveData {
  syncCode: string;
  updatedAt: string;
  character: Character;
  resources: Resources;
  skills: SkillNode[];
  achievements: Achievement[];
  inventory: EquipmentItem[];
  stats: {
    totalHarvests: number;
    totalDamageDealt: number;
    itemsCrafted: number;
  };
}
