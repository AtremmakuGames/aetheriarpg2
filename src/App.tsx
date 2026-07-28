import React, { useState, useEffect } from 'react';
import { Achievement, Character, EquipmentItem, GatheringNode, GatheringZone, HeroClass, Resources, SkillNode } from './types';
import { GATHERING_ZONES, INITIAL_ACHIEVEMENTS, INITIAL_CHARACTER, INITIAL_RESOURCES, INITIAL_SKILLS, STARTER_INVENTORY } from './data/gameData';
import { IPadFrame } from './components/iPadFrame';
import { GameCanvas } from './components/GameCanvas';
import { CharacterPanel } from './components/CharacterPanel';
import { CraftingForge } from './components/CraftingForge';
import { InventoryPanel } from './components/InventoryPanel';
import { SkillTreePanel } from './components/SkillTreePanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { AfkFarmPanel } from './components/AfkFarmPanel';
import { StorePanel } from './components/StorePanel';
import { FarmDimensionPanel } from './components/FarmDimensionPanel';
import { sound } from './audio';
import {
  Shield,
  Zap,
  Sword,
  Pickaxe,
  Hammer,
  Trophy,
  Sparkles,
  Coins,
  TreePine,
  Gem,
  Package,
  Volume2,
  VolumeX,
  ShoppingBag,
  Sprout,
  Utensils,
  Apple,
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('canvas');

  // Active Gathering Zone
  const [activeZoneIndex, setActiveZoneIndex] = useState<number>(0);

  // Character State
  const [character, setCharacter] = useState<Character>(() => {
    const saved = localStorage.getItem('aetheria_character');
    return saved ? JSON.parse(saved) : INITIAL_CHARACTER;
  });

  // Resources State
  const [resources, setResources] = useState<Resources>(() => {
    const saved = localStorage.getItem('aetheria_resources');
    return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
  });

  // Skills State
  const [skills, setSkills] = useState<SkillNode[]>(() => {
    const saved = localStorage.getItem('aetheria_skills');
    return saved ? JSON.parse(saved) : INITIAL_SKILLS;
  });

  // Achievements State
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('aetheria_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  // Inventory State
  const [inventory, setInventory] = useState<EquipmentItem[]>(() => {
    const saved = localStorage.getItem('aetheria_inventory');
    return saved ? JSON.parse(saved) : STARTER_INVENTORY;
  });

  // Stats Tracker
  const [stats, setStats] = useState({
    totalHarvests: 0,
    totalDamageDealt: 0,
    itemsCrafted: 0,
  });

  // AFK Auto-Farm State
  const [isAfkActive, setIsAfkActive] = useState<boolean>(false);
  const [afkTimeLeft, setAfkTimeLeft] = useState<number>(0);
  const [afkLogs, setAfkLogs] = useState<string[]>([]);

  // Auto Local Storage Persistence
  useEffect(() => {
    localStorage.setItem('aetheria_character', JSON.stringify(character));
    localStorage.setItem('aetheria_resources', JSON.stringify(resources));
    localStorage.setItem('aetheria_skills', JSON.stringify(skills));
    localStorage.setItem('aetheria_achievements', JSON.stringify(achievements));
    localStorage.setItem('aetheria_inventory', JSON.stringify(inventory));
  }, [character, resources, skills, achievements, inventory]);

  // AFK Farmer Timer & High-Speed Gathering Loop (0.3s tick)
  useEffect(() => {
    if (!isAfkActive || afkTimeLeft <= 0) return;

    // 1-second countdown interval
    const countdownTimer = setInterval(() => {
      setAfkTimeLeft((prev) => {
        if (prev <= 1) {
          setIsAfkActive(false);
          setAfkLogs((logs) => [`[SYSTEM] ⏰ AFK Farmer duration completed!`, ...logs.slice(0, 20)]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Rapid AFK Gathering Loop (every 300ms)
    const gatherLoop = setInterval(() => {
      const curZone = GATHERING_ZONES[activeZoneIndex];
      const validNodes = curZone.nodes.filter((n) => !n.isPortal);
      if (validNodes.length === 0) return;

      const randomNode = validNodes[Math.floor(Math.random() * validNodes.length)];
      const isCrit = Math.random() < 0.25;
      const mult = isCrit ? 2.5 : 1.2;
      const amount = Math.floor((randomNode.resourceYield + 5) * mult);
      const xpAmount = Math.floor(20 * mult);

      setResources((prev) => ({
        ...prev,
        [randomNode.type]: (prev[randomNode.type as keyof Resources] || 0) + amount,
        gold: prev.gold + Math.floor(amount * 1.5),
      }));

      addXP(xpAmount);
      setStats((s) => ({ ...s, totalHarvests: s.totalHarvests + 1 }));

      const logMsg = isCrit
        ? `⚡ AFK CRIT HARVEST! +${amount} ${randomNode.type.toUpperCase()} & +${xpAmount} XP (${curZone.name})`
        : `⚙️ Auto-Farm: +${amount} ${randomNode.type.toUpperCase()} (+${xpAmount} XP)`;

      setAfkLogs((prev) => [logMsg, ...prev.slice(0, 25)]);
    }, 300);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(gatherLoop);
    };
  }, [isAfkActive, afkTimeLeft, activeZoneIndex]);

  // Skill Cooldown Ticker (1 sec interval)
  useEffect(() => {
    const interval = setInterval(() => {
      setSkills((prevSkills) =>
        prevSkills.map((s) => {
          if (s.currentCooldown > 0) {
            return { ...s, currentCooldown: s.currentCooldown - 1 };
          }
          return s;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hunger System Ticker (decreases hunger by 1 every 15 seconds if > 0)
  useEffect(() => {
    const hungerTimer = setInterval(() => {
      setResources((prev) => {
        const curHunger = prev.hunger !== undefined ? prev.hunger : 100;
        if (curHunger <= 0) return prev;
        return { ...prev, hunger: Math.max(0, curHunger - 1) };
      });
    }, 15000);
    return () => clearInterval(hungerTimer);
  }, []);

  // Companion Pet Auto-Gathering Ticker (every 3 sec if pet equipped)
  useEffect(() => {
    if (!character.equipped.pet) return;

    const petInterval = setInterval(() => {
      const currentZone = GATHERING_ZONES[activeZoneIndex];
      const randomNode = currentZone.nodes[Math.floor(Math.random() * currentZone.nodes.length)];

      const yieldAmount = Math.floor(randomNode.resourceYield * 0.8 + 2);
      setResources((prev) => ({
        ...prev,
        [randomNode.type]: (prev[randomNode.type as keyof Resources] || 0) + yieldAmount,
      }));

      setStats((s) => ({ ...s, totalHarvests: s.totalHarvests + 1 }));
      checkAchievements('resources', stats.totalHarvests + 1);
    }, 3000);

    return () => clearInterval(petInterval);
  }, [character.equipped.pet, activeZoneIndex, stats.totalHarvests]);

  // XP & Level Up Logic
  const addXP = (amount: number) => {
    let newXp = character.xp + amount;
    let newLevel = character.level;
    let newXpReq = character.xpToNextLevel;
    let newStatPts = character.statPoints;
    let newSkillPts = character.skillPoints;
    let leveledUp = false;

    while (newXp >= newXpReq) {
      newXp -= newXpReq;
      newLevel += 1;
      newXpReq = newLevel * 120 + 60;
      newStatPts += 3;
      newSkillPts += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      sound.playLevelUp();
      checkAchievements('level', newLevel);
    }

    setCharacter((prev) => ({
      ...prev,
      level: newLevel,
      xp: newXp,
      xpToNextLevel: newXpReq,
      statPoints: newStatPts,
      skillPoints: newSkillPts,
      title: newLevel >= 20 ? 'Master Realm Crafter' : newLevel >= 10 ? 'Aether Veteran' : 'Novice Adventurer',
    }));
  };

  // Achievement Verification Helper
  const checkAchievements = (category: string, value: number) => {
    setAchievements((prev) =>
      prev.map((ach) => {
        if (ach.category === category) {
          const newProg = Math.max(ach.currentProgress, value);
          const isNowReady = newProg >= ach.targetProgress;
          return {
            ...ach,
            currentProgress: newProg,
          };
        }
        return ach;
      })
    );
  };

  // Node Harvest Action Handler
  const handleHarvestNode = (node: GatheringNode, isCrit: boolean, multiplier: number) => {
    const baseYield = node.resourceYield;

    // Apply class bonuses & stats
    let classBonus = 1.0;
    if (character.heroClass === 'warrior' && (node.type === 'iron' || node.type === 'stone')) classBonus = 1.25;
    if (character.heroClass === 'mage' && (node.type === 'arcaneDust' || node.type === 'crystal')) classBonus = 1.25;
    if (character.heroClass === 'ranger' && node.type === 'wood') classBonus = 1.30;

    const extraGearYield = character.equipped.weapon?.statBonus.extraYield || 0;
    const totalYield = Math.floor((baseYield + extraGearYield) * (1 + character.attributes.gatheringSpeed * 0.02) * multiplier * classBonus);

    // Update Resources
    setResources((prev) => {
      const current = prev[node.type as keyof Resources] || 0;
      const updated = { ...prev, [node.type]: current + totalYield };

      // Bonus Drop Chance
      if (node.bonusYieldItem && Math.random() < node.bonusChance) {
        const bonusType = node.bonusYieldItem;
        updated[bonusType] = (updated[bonusType as keyof Resources] || 0) + Math.floor(totalYield * 0.5 + 1);
      }

      return updated;
    });

    // Add Gold & XP
    addXP(15 * multiplier);
    setResources((prev) => ({ ...prev, gold: prev.gold + Math.floor(5 * multiplier) }));

    const newHarvestCount = stats.totalHarvests + 1;
    setStats((s) => ({ ...s, totalHarvests: newHarvestCount }));

    checkAchievements('resources', newHarvestCount);
  };

  // Cast Active Skill
  const handleCastSkill = (skill: SkillNode) => {
    sound.playSkillCast();

    // Trigger Cooldown
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, currentCooldown: skill.cooldownSec } : s))
    );

    const currentZone = GATHERING_ZONES[activeZoneIndex];

    if (skill.id === 'whirlwind_harvest') {
      currentZone.nodes.forEach((node) => {
        handleHarvestNode({ ...node, currentHp: node.maxHp, x: node.defaultX ?? 50, y: node.defaultY ?? 50 }, true, 2.0);
      });
    } else if (skill.id === 'meteor_strike') {
      currentZone.nodes.forEach((node) => {
        handleHarvestNode({ ...node, currentHp: node.maxHp, x: node.defaultX ?? 50, y: node.defaultY ?? 50 }, true, 2.5);
      });
    } else if (skill.id === 'arcane_overcharge') {
      currentZone.nodes.forEach((node) => {
        handleHarvestNode({ ...node, currentHp: node.maxHp, x: node.defaultX ?? 50, y: node.defaultY ?? 50 }, true, 2.0);
      });
    } else if (skill.id === 'time_dilation') {
      currentZone.nodes.forEach((node) => {
        handleHarvestNode({ ...node, currentHp: node.maxHp, x: node.defaultX ?? 50, y: node.defaultY ?? 50 }, true, 3.0);
      });
    } else if (skill.id === 'gold_frenzy') {
      setResources((prev) => ({
        ...prev,
        gold: prev.gold + 350,
      }));
      addXP(75);
    }
  };

  // Stat Allocation
  const handleAllocateStat = (statKey: keyof Character['attributes']) => {
    if (character.statPoints <= 0) return;

    setCharacter((prev) => ({
      ...prev,
      statPoints: prev.statPoints - 1,
      attributes: {
        ...prev.attributes,
        [statKey]: prev.attributes[statKey] + 1,
      },
    }));
  };

  // Hero Class Change
  const handleChangeClass = (newClass: HeroClass) => {
    setCharacter((prev) => ({ ...prev, heroClass: newClass }));
  };

  // Craft Equipment Item
  const handleCraftItem = (item: EquipmentItem) => {
    // Deduct resources
    setResources((prev) => {
      const next = { ...prev };
      for (const [rKey, amt] of Object.entries(item.cost)) {
        const key = rKey as keyof Resources;
        next[key] = Math.max(0, (next[key] || 0) - (amt || 0));
      }
      return next;
    });

    // Add to inventory and auto-equip if slot empty
    setInventory((prev) => [...prev, item]);

    setCharacter((prev) => {
      const equippedSlot = prev.equipped[item.slot];
      if (!equippedSlot) {
        return {
          ...prev,
          equipped: { ...prev.equipped, [item.slot]: item },
        };
      }
      return prev;
    });

    const newCraftCount = stats.itemsCrafted + 1;
    setStats((s) => ({ ...s, itemsCrafted: newCraftCount }));
    checkAchievements('crafting', newCraftCount);
  };

  // Unequip Item
  const handleUnequipItem = (slot: keyof Character['equipped']) => {
    setCharacter((prev) => {
      const itemToUnequip = prev.equipped[slot];
      if (itemToUnequip) {
        setInventory((inv) => [...inv, itemToUnequip]);
      }
      const newEquipped = { ...prev.equipped };
      delete newEquipped[slot];
      return { ...prev, equipped: newEquipped };
    });
  };

  // Equip Item from Inventory
  const handleEquipItem = (item: EquipmentItem) => {
    setCharacter((prev) => {
      const previouslyEquipped = prev.equipped[item.slot];

      setInventory((inv) => {
        const filtered = inv.filter((i) => i.id !== item.id);
        if (previouslyEquipped && previouslyEquipped.id !== item.id) {
          return [...filtered, previouslyEquipped];
        }
        return filtered;
      });

      return {
        ...prev,
        equipped: {
          ...prev.equipped,
          [item.slot]: item,
        },
      };
    });
  };

  // Sell Item from Inventory
  const handleSellItem = (item: EquipmentItem) => {
    const goldValue = item.sellPriceGold || 50;
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    setResources((prev) => ({ ...prev, gold: prev.gold + goldValue }));
  };

  // Buy AFK Farmer charge (7500 gold)
  const handleBuyAfkFarmer = () => {
    if (resources.gold < 7500) return;
    sound.playCraft();
    setResources((prev) => ({
      ...prev,
      gold: prev.gold - 7500,
      afkFarmerCharges: (prev.afkFarmerCharges || 0) + 1,
    }));
  };

  // Activate AFK Farmer (5 minutes = 300 seconds)
  const handleActivateAfkFarmer = () => {
    if ((resources.afkFarmerCharges || 0) <= 0 || isAfkActive) return;
    sound.playSkillCast();
    setResources((prev) => ({
      ...prev,
      afkFarmerCharges: Math.max(0, (prev.afkFarmerCharges || 0) - 1),
    }));
    setIsAfkActive(true);
    setAfkTimeLeft(300);
    setAfkLogs((prev) => [`⚡ AFK Farmer activated for 5 minutes! Farming ${GATHERING_ZONES[activeZoneIndex].name}`, ...prev]);
  };

  // Drink Healing Potion
  const handleUseHealingPotion = () => {
    if ((resources.healingPotions || 0) <= 0) return;
    sound.playSkillCast();
    setResources((prev) => ({
      ...prev,
      healingPotions: Math.max(0, (prev.healingPotions || 0) - 1),
    }));
  };

  // Craft Healing Potion (15 herbs + 10 arcane dust + 50 gold per potion)
  const handleCraftHealingPotion = (count: number = 1) => {
    const reqHerbs = 15 * count;
    const reqDust = 10 * count;
    const reqGold = 50 * count;

    if (
      (resources.herbs || 0) < reqHerbs ||
      (resources.arcaneDust || 0) < reqDust ||
      (resources.gold || 0) < reqGold
    ) {
      return;
    }

    sound.playCraft();
    setResources((prev) => ({
      ...prev,
      herbs: Math.max(0, (prev.herbs || 0) - reqHerbs),
      arcaneDust: Math.max(0, (prev.arcaneDust || 0) - reqDust),
      gold: Math.max(0, (prev.gold || 0) - reqGold),
      healingPotions: (prev.healingPotions || 0) + count,
    }));
  };

  // Upgrade/Enhance Gear item
  const handleUpgradeItem = (item: EquipmentItem) => {
    const currentLvl = item.enhancementLevel || 0;
    const upgradeCost = 300 * (currentLvl + 1);
    if (resources.gold < upgradeCost) return;

    sound.playLevelUp();
    setResources((prev) => ({ ...prev, gold: prev.gold - upgradeCost }));

    // Calculate boosted stats
    const updatedBonus: Record<string, number> = {};
    Object.entries(item.statBonus).forEach(([k, v]) => {
      updatedBonus[k] = Math.floor(v * 1.25 + 2);
    });

    const updatedItem: EquipmentItem = {
      ...item,
      enhancementLevel: currentLvl + 1,
      statBonus: updatedBonus,
    };

    // Update in inventory
    setInventory((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));

    // Update in equipped slot if equipped
    setCharacter((prev) => {
      if (prev.equipped[item.slot]?.id === item.id) {
        return {
          ...prev,
          equipped: {
            ...prev.equipped,
            [item.slot]: updatedItem,
          },
        };
      }
      return prev;
    });
  };

  // Unlock new Hero Class (5000 Gold or 500 Gems)
  const handleUnlockClass = (heroClass: HeroClass, currency: 'gold' | 'gems') => {
    const currentUnlocked = character.unlockedClasses || ['warrior'];
    if (currentUnlocked.includes(heroClass)) return;

    if (currency === 'gold') {
      if (resources.gold < 5000) return;
      setResources((prev) => ({ ...prev, gold: prev.gold - 5000 }));
    } else {
      if (resources.gems < 500) return;
      setResources((prev) => ({ ...prev, gems: prev.gems - 500 }));
    }

    sound.playLevelUp();
    setCharacter((prev) => ({
      ...prev,
      heroClass,
      unlockedClasses: [...(prev.unlockedClasses || ['warrior']), heroClass],
    }));
  };

  // Add Starter Equipment Items
  const handleAddStarterItems = () => {
    setInventory((prev) => [...prev, ...STARTER_INVENTORY]);
  };

  // Skill Unlock
  const handleUnlockSkill = (skillId: string) => {
    const targetSkill = skills.find((s) => s.id === skillId);
    if (!targetSkill || character.skillPoints < targetSkill.costPoints) return;

    setCharacter((prev) => ({ ...prev, skillPoints: prev.skillPoints - targetSkill.costPoints }));
    setSkills((prev) => prev.map((s) => (s.id === skillId ? { ...s, unlocked: true } : s)));

    const unlockedCount = skills.filter((s) => s.unlocked).length + 1;
    checkAchievements('skills', unlockedCount);
  };

  // Achievement Reward Claim
  const handleClaimReward = (achievementId: string) => {
    const target = achievements.find((a) => a.id === achievementId);
    if (!target || target.unlocked) return;

    setResources((prev) => ({ ...prev, gems: prev.gems + target.rewardGems }));
    addXP(target.rewardXP);

    setAchievements((prev) =>
      prev.map((a) => (a.id === achievementId ? { ...a, unlocked: true } : a))
    );
  };

  // Store: Buy Prismatic Merchant Gear with Gold
  const handleBuyPrismaticGear = (item: EquipmentItem) => {
    const goldCost = item.cost.gold || 0;
    if (resources.gold < goldCost) return;

    setResources((prev) => ({ ...prev, gold: prev.gold - goldCost }));
    setInventory((prev) => [...prev, item]);
  };

  // Store: Exchange Gems for Gold
  const handleExchangeGemsForGold = (gemsAmount: number, goldAmount: number) => {
    if (resources.gems < gemsAmount) return;
    setResources((prev) => ({
      ...prev,
      gems: prev.gems - gemsAmount,
      gold: prev.gold + goldAmount,
    }));
  };

  // Store: Buy EXP Potion (+1 Level for 750 Gems)
  const handleBuyExpPotion = () => {
    if (resources.gems < 750) return;
    setResources((prev) => ({ ...prev, gems: prev.gems - 750 }));
    addXP(character.xpToNextLevel); // Instantly grants full XP for level up
  };

  // Store: Buy Food
  const handleBuyFood = (
    foodName: string,
    hungerRestore: number,
    goldCost: number,
    gemsCost: number,
    hpHeal: number = 0
  ) => {
    if (goldCost > 0 && resources.gold < goldCost) return;
    if (gemsCost > 0 && resources.gems < gemsCost) return;

    setResources((prev) => ({
      ...prev,
      gold: goldCost > 0 ? prev.gold - goldCost : prev.gold,
      gems: gemsCost > 0 ? prev.gems - gemsCost : prev.gems,
      hunger: Math.min(100, (prev.hunger || 0) + hungerRestore),
    }));
  };

  // Farm: Upgrade Hoe with Gems ONLY
  const handleUpgradeHoeWithGems = (gemCost: number, nextTier: number) => {
    if (resources.gems < gemCost) return;
    setResources((prev) => ({
      ...prev,
      gems: prev.gems - gemCost,
      hoeTier: nextTier,
    }));
  };

  // Farm: Harvest Crop
  const handleHarvestCrop = (goldAmount: number, gemsAmount: number, cropName: string) => {
    setResources((prev) => ({
      ...prev,
      gold: prev.gold + goldAmount,
      gems: prev.gems + gemsAmount,
    }));
  };

  // Farm: Claim Quest Reward
  const handleClaimQuestReward = (questId: string, rewardGems: number) => {
    setResources((prev) => ({
      ...prev,
      gems: prev.gems + rewardGems,
    }));
  };

  // Farm: Attack Boss
  const handleAttackFarmBoss = (dmg: number) => {
    setStats((s) => ({ ...s, totalDamageDealt: s.totalDamageDealt + dmg }));
  };

  const activeZone = GATHERING_ZONES[activeZoneIndex];

  // Portal Travel Handler
  const handleTravelPortal = (targetZoneId: string) => {
    const foundIdx = GATHERING_ZONES.findIndex((z) => z.id === targetZoneId);
    if (foundIdx !== -1) {
      sound.playSkillCast();
      setActiveZoneIndex(foundIdx);
    }
  };

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <IPadFrame
      activeView={activeTab}
      onNavigate={setActiveTab}
      syncStatus="synced"
      syncCode=""
    >
      {/* Top Resource & XP Status Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 z-30">
        {/* Level & XP Progress & Audio / Sync controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">
              Lvl {character.level}
            </span>
            <div className="w-24 sm:w-36 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${(character.xp / character.xpToNextLevel) * 100}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-bold hidden sm:inline">
            {character.xp}/{character.xpToNextLevel} XP
          </span>

          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* Currency & Material Badges Bar */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono font-bold">
          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{resources.gold.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300 flex items-center gap-1">
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            <span>{resources.gems.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-rose-300 flex items-center gap-1 font-mono font-bold" title="Hero Hunger Level">
            <Apple className="w-3.5 h-3.5 text-rose-400" />
            <span>{resources.hunger !== undefined ? resources.hunger : 100}%</span>
          </div>

          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-300 flex items-center gap-1">
            <TreePine className="w-3.5 h-3.5 text-emerald-400" />
            <span>{resources.wood}</span>
          </div>

          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-400 flex items-center gap-1">
            <Pickaxe className="w-3.5 h-3.5 text-amber-400" />
            <span>{resources.iron}</span>
          </div>

          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-purple-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{resources.mythril}</span>
          </div>
        </div>
      </div>

      {/* Main Tab View Navigation Row */}
      <div className="bg-slate-950 border-b border-slate-800 p-2 flex items-center justify-start gap-1 overflow-x-auto z-30">
        {[
          { id: 'canvas', label: 'Gathering Realm', icon: Pickaxe },
          { id: 'store', label: 'Merchant Store', icon: ShoppingBag },
          { id: 'farm', label: 'Farm Realm', icon: Sprout },
          { id: 'afk', label: 'AFK Auto-Farm', icon: Zap },
          { id: 'inventory', label: 'Inventory & Gear', icon: Package },
          { id: 'character', label: 'Hero & Stats', icon: Shield },
          { id: 'forge', label: 'Blacksmith Forge', icon: Hammer },
          { id: 'skills', label: 'Skill Matrix', icon: Sparkles },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
        ].map(({ id, label, icon: IconComp }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              onClick={() => {
                sound.playClick();
                setActiveTab(id);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Display Area */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto z-20 space-y-4">
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            {/* Zone Selector Selector Bar */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider pl-1 hidden sm:inline">
                Zones:
              </span>
              <div className="flex items-center gap-2">
                {GATHERING_ZONES.map((z, idx) => {
                  const unlocked = character.level >= z.requiredLevel;
                  const isSelected = activeZoneIndex === idx;

                  return (
                    <button
                      key={z.id}
                      disabled={!unlocked}
                      onClick={() => {
                        if (unlocked) {
                          sound.playClick();
                          setActiveZoneIndex(idx);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-md'
                          : unlocked
                          ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.zoneColor }}></span>
                      <span>{z.name}</span>
                      {!unlocked && <span className="text-[9px] text-rose-400">(Lvl {z.requiredLevel})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive 60FPS Game Canvas */}
            <GameCanvas
              zone={activeZone}
              character={character}
              resources={resources}
              skills={skills}
              onHarvestNode={handleHarvestNode}
              onCastSkill={handleCastSkill}
              onUnlockSkill={handleUnlockSkill}
              onTravelPortal={handleTravelPortal}
              onUseHealingPotion={handleUseHealingPotion}
              activeZoneId={activeZone.id}
            />
          </div>
        )}

        {activeTab === 'store' && (
          <StorePanel
            resources={resources}
            character={character}
            onBuyPrismaticGear={handleBuyPrismaticGear}
            onExchangeGemsForGold={handleExchangeGemsForGold}
            onBuyExpPotion={handleBuyExpPotion}
            onBuyFood={handleBuyFood}
          />
        )}

        {activeTab === 'farm' && (
          <FarmDimensionPanel
            resources={resources}
            character={character}
            onUpgradeHoeWithGems={handleUpgradeHoeWithGems}
            onHarvestCrop={handleHarvestCrop}
            onClaimQuestReward={handleClaimQuestReward}
            onAttackFarmBoss={handleAttackFarmBoss}
          />
        )}

        {activeTab === 'afk' && (
          <AfkFarmPanel
            resources={resources}
            activeZoneName={activeZone.name}
            isAfkActive={isAfkActive}
            afkTimeLeft={afkTimeLeft}
            afkLogs={afkLogs}
            onBuyAfkFarmer={handleBuyAfkFarmer}
            onActivateAfkFarmer={handleActivateAfkFarmer}
            onUseHealingPotion={handleUseHealingPotion}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPanel
            character={character}
            resources={resources}
            inventory={inventory}
            onEquipItem={handleEquipItem}
            onUnequipItem={handleUnequipItem}
            onSellItem={handleSellItem}
            onUpgradeItem={handleUpgradeItem}
            onAddStarterItems={handleAddStarterItems}
          />
        )}

        {activeTab === 'character' && (
          <CharacterPanel
            character={character}
            resources={resources}
            onAllocateStat={handleAllocateStat}
            onChangeClass={handleChangeClass}
            onUnlockClass={handleUnlockClass}
            onUnequipItem={handleUnequipItem}
          />
        )}

        {activeTab === 'forge' && (
          <CraftingForge
            resources={resources}
            heroLevel={character.level}
            inventory={inventory}
            onCraftItem={handleCraftItem}
            onCraftHealingPotion={handleCraftHealingPotion}
          />
        )}

        {activeTab === 'skills' && (
          <SkillTreePanel
            skills={skills}
            skillPoints={character.skillPoints}
            onUnlockSkill={handleUnlockSkill}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsPanel
            achievements={achievements}
            onClaimReward={handleClaimReward}
          />
        )}
      </div>
    </IPadFrame>
  );
}
