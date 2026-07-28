import React, { useState, useEffect } from 'react';
import { Character, FarmBoss, FarmCropPlot, HoeQuest, Resources } from '../types';
import { sound } from '../audio';
import {
  Sprout,
  Gem,
  Coins,
  Shield,
  Zap,
  Sword,
  CheckCircle,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  Utensils,
  AlertTriangle,
} from 'lucide-react';

interface FarmDimensionPanelProps {
  resources: Resources;
  character: Character;
  onUpgradeHoeWithGems: (gemCost: number, nextTier: number) => void;
  onHarvestCrop: (goldAmount: number, gemsAmount: number, cropName: string) => void;
  onClaimQuestReward: (questId: string, rewardGems: number) => void;
  onAttackFarmBoss: (dmg: number) => void;
}

export const FarmDimensionPanel: React.FC<FarmDimensionPanelProps> = ({
  resources,
  character,
  onUpgradeHoeWithGems,
  onHarvestCrop,
  onClaimQuestReward,
  onAttackFarmBoss,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'crops' | 'hoe' | 'quests' | 'bosses'>('crops');
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Hoe Tiers Data
  const HOE_TIERS = [
    { tier: 1, name: 'Wooden Hoe', gemCost: 0, mult: '1.0x', desc: 'Basic wooden farming hoe.' },
    { tier: 2, name: 'Iron Hoe', gemCost: 150, mult: '2.0x', desc: 'Hardened iron hoe. Multiplies crop yields by 2x!' },
    { tier: 3, name: 'Mythril Hoe', gemCost: 400, mult: '3.5x', desc: 'Enchanted mythril hoe. Multiplies crop yields by 3.5x!' },
    { tier: 4, name: 'Dragon Flame Hoe', gemCost: 800, mult: '5.0x', desc: 'Forged in wyrmfire. Multiplies crop yields by 5x!' },
    { tier: 5, name: 'Prismatic Cosmic Hoe', gemCost: 1500, mult: '10.0x', desc: 'Ultimate cosmic hoe! Multiplies crop yields by 10x!' },
  ];

  // Crop Plots State
  const [plots, setPlots] = useState<FarmCropPlot[]>([
    { id: 'plot_1', cropType: 'wheat', name: 'Golden Wheat 🌾', growthTimeSec: 8, plantedAt: null, ready: false, goldReward: 400, gemsReward: 5, emoji: '🌾' },
    { id: 'plot_2', cropType: 'carrot', name: 'Sweet Carrot 🥕', growthTimeSec: 15, plantedAt: null, ready: false, goldReward: 900, gemsReward: 12, emoji: '🥕' },
    { id: 'plot_3', cropType: 'golden_berry', name: 'Golden Berry 🍓', growthTimeSec: 25, plantedAt: null, ready: false, goldReward: 2000, gemsReward: 25, emoji: '🍓' },
    { id: 'plot_4', cropType: 'starflower', name: 'Cosmic Starflower 🌸', growthTimeSec: 40, plantedAt: null, ready: false, goldReward: 5000, gemsReward: 60, emoji: '🌸' },
  ]);

  // Quests State
  const [quests, setQuests] = useState<HoeQuest[]>([
    { id: 'quest_1', title: 'First Harvest', description: 'Plant and harvest any 3 crop plots on the Farm.', targetCount: 3, currentCount: 0, rewardGems: 100, completed: false, type: 'plant' },
    { id: 'quest_2', title: 'Iron Hoe Upgrade', description: 'Upgrade your Hoe to Tier 2 (Iron Hoe) using Gems.', targetCount: 2, currentCount: resources.hoeTier, rewardGems: 250, completed: resources.hoeTier >= 2, type: 'upgrade_hoe' },
    { id: 'quest_3', title: 'Golden Berry Master', description: 'Harvest 5 Golden Berries or Starflowers.', targetCount: 5, currentCount: 0, rewardGems: 400, completed: false, type: 'plant' },
    { id: 'quest_4', title: 'Defeat Mad Boss Bull 🐂', description: 'Slay the Mad Boss Bull in the Farm Boss arena.', targetCount: 1, currentCount: 0, rewardGems: 600, completed: false, type: 'defeat_boss' },
  ]);

  // Farm Bosses State
  const [bosses, setBosses] = useState<FarmBoss[]>([
    { id: 'boss_bull', name: 'Mad Boss Bull 🐂', emoji: '🐂', maxHp: 15000, currentHp: 15000, attackDmg: 35, rewardGold: 10000, rewardGems: 150, level: 10 },
    { id: 'boss_chicken', name: 'Giant Mutant Rooster 🐔', emoji: '🐔', maxHp: 30000, currentHp: 30000, attackDmg: 55, rewardGold: 25000, rewardGems: 350, level: 20 },
    { id: 'boss_ram', name: 'Demonic Ram 🐏', emoji: '🐏', maxHp: 60000, currentHp: 60000, attackDmg: 80, rewardGold: 60000, rewardGems: 750, level: 30 },
    { id: 'boss_pig', name: 'Golden Cosmic Pig 🐖', emoji: '🐖', maxHp: 120000, currentHp: 120000, attackDmg: 110, rewardGold: 150000, rewardGems: 1500, level: 40 },
  ]);

  const [selectedBossIndex, setSelectedBossIndex] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  // Growth Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setPlots((prev) =>
        prev.map((p) => {
          if (p.plantedAt && !p.ready) {
            const elapsed = (Date.now() - p.plantedAt) / 1000;
            if (elapsed >= p.growthTimeSec) {
              return { ...p, ready: true };
            }
          }
          return p;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Boss Auto-Attack Loop (Boss attacks player every 2.5s)
  useEffect(() => {
    const bossTimer = setInterval(() => {
      const activeBoss = bosses[selectedBossIndex];
      if (activeBoss && activeBoss.currentHp > 0) {
        sound.playGather();
        showNotice(`💥 Boss ${activeBoss.name} struck you for -${activeBoss.attackDmg} DMG!`);
      }
    }, 2500);

    return () => clearInterval(bossTimer);
  }, [selectedBossIndex, bosses]);

  // Plant Crop Plot
  const handlePlantPlot = (plotId: string) => {
    sound.playGather();
    setPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, plantedAt: Date.now(), ready: false } : p))
    );
    showNotice('🌱 Seed planted! Crops growing...');
  };

  // Harvest Ready Crop
  const handleHarvestPlot = (plot: FarmCropPlot, sellChoice: 'gold' | 'gems') => {
    sound.playLevelUp();
    const currentHoe = HOE_TIERS.find((h) => h.tier === resources.hoeTier) || HOE_TIERS[0];
    const hoeMultiplier = parseFloat(currentHoe.mult);

    const finalGold = Math.floor(plot.goldReward * hoeMultiplier);
    const finalGems = Math.floor(plot.gemsReward * hoeMultiplier);

    if (sellChoice === 'gold') {
      onHarvestCrop(finalGold, 0, plot.name);
      showNotice(`🌾 Harvested ${plot.name}! Received +${finalGold.toLocaleString()} Gold!`);
    } else {
      onHarvestCrop(0, finalGems, plot.name);
      showNotice(`💎 Harvested ${plot.name}! Received +${finalGems.toLocaleString()} Gems!`);
    }

    // Reset plot
    setPlots((prev) =>
      prev.map((p) => (p.id === plot.id ? { ...p, plantedAt: null, ready: false } : p))
    );

    // Update quest progress
    setQuests((prev) =>
      prev.map((q) => {
        if (q.type === 'plant' && !q.completed) {
          const nextVal = q.currentCount + 1;
          return {
            ...q,
            currentCount: nextVal,
            completed: nextVal >= q.targetCount,
          };
        }
        return q;
      })
    );
  };

  // Attack Farm Boss
  const handleHitBoss = () => {
    const curBoss = bosses[selectedBossIndex];
    if (curBoss.currentHp <= 0) return;

    sound.playSkillCast();
    const heroDmg = Math.floor(character.attributes.strength * 8 + character.attributes.agility * 6 + character.attributes.intelligence * 5);
    const newHp = Math.max(0, curBoss.currentHp - heroDmg);

    setBosses((prev) =>
      prev.map((b, idx) => (idx === selectedBossIndex ? { ...b, currentHp: newHp } : b))
    );

    onAttackFarmBoss(heroDmg);

    if (newHp <= 0) {
      sound.playLevelUp();
      showNotice(`🎉 BOSS SLAIN! Defeated ${curBoss.name}! Earned +${curBoss.rewardGold.toLocaleString()} Gold & +${curBoss.rewardGems} Gems!`);
      onHarvestCrop(curBoss.rewardGold, curBoss.rewardGems, curBoss.name);

      // Defeat boss quest check
      setQuests((prev) =>
        prev.map((q) => {
          if (q.type === 'defeat_boss') {
            return { ...q, currentCount: 1, completed: true };
          }
          return q;
        })
      );
    }
  };

  const currentHoeInfo = HOE_TIERS.find((h) => h.tier === resources.hoeTier) || HOE_TIERS[0];
  const nextHoeInfo = HOE_TIERS.find((h) => h.tier === resources.hoeTier + 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 rounded-2xl shadow-lg text-slate-950">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              Farm Realm & Agriculture
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                FARM DIMENSION
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Plant crops, upgrade Hoes with Gems ONLY, complete farming quests, and battle huge Farm Bosses!
            </p>
          </div>
        </div>

        {/* Currency & Hoe Status */}
        <div className="flex items-center gap-3 bg-slate-950 p-2.5 px-4 rounded-xl border border-slate-800 font-mono text-xs">
          <div className="text-emerald-400 font-bold flex items-center gap-1">
            <Sprout className="w-4 h-4" />
            <span>Hoe: {currentHoeInfo.name} ({currentHoeInfo.mult})</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="text-amber-400 font-bold flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>{resources.gold.toLocaleString()} Gold</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="text-cyan-400 font-bold flex items-center gap-1">
            <Gem className="w-3.5 h-3.5" />
            <span>{resources.gems.toLocaleString()} Gems</span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('crops')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'crops'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Gardening Plots</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hoe')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'hoe'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Gem className="w-4 h-4" />
          <span>Hoe Upgrades (GEMS ONLY)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('quests')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'quests'
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Hoe Quests</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bosses')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'bosses'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Farm Animal Bosses</span>
        </button>
      </div>

      {/* Sub-tab 1: Gardening Plots */}
      {activeSubTab === 'crops' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Sprout className="w-4 h-4" />
                Agri-Crops Field
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Plant seeds and harvest crops! Current Hoe Yield Multiplier: <span className="text-emerald-400 font-bold">{currentHoeInfo.mult}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plots.map((plot) => {
              const isPlanted = plot.plantedAt !== null;
              const elapsed = isPlanted ? (now - (plot.plantedAt || 0)) / 1000 : 0;
              const pct = isPlanted ? Math.min(100, (elapsed / plot.growthTimeSec) * 100) : 0;

              return (
                <div
                  key={plot.id}
                  className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{plot.emoji}</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      Growth: {plot.growthTimeSec}s
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-100">{plot.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Harvest Value: <span className="text-amber-400 font-mono font-bold">+{Math.floor(plot.goldReward * parseFloat(currentHoeInfo.mult))} Gold</span> OR <span className="text-cyan-400 font-mono font-bold">+{Math.floor(plot.gemsReward * parseFloat(currentHoeInfo.mult))} Gems</span>
                    </p>
                  </div>

                  {/* Growth Progress Bar */}
                  {isPlanted && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>{plot.ready ? ' READY FOR HARVEST!' : 'GROWING...'}</span>
                        <span>{Math.floor(pct)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    {!isPlanted ? (
                      <button
                        onClick={() => handlePlantPlot(plot.id)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2"
                      >
                        <Sprout className="w-4 h-4" />
                        <span>PLANT SEED</span>
                      </button>
                    ) : plot.ready ? (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          onClick={() => handleHarvestPlot(plot, 'gold')}
                          className="py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Sell Gold</span>
                        </button>
                        <button
                          onClick={() => handleHarvestPlot(plot, 'gems')}
                          className="py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Gem className="w-3.5 h-3.5" />
                          <span>Sell Gems</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full text-center py-2 bg-slate-900 text-slate-500 font-mono text-xs rounded-xl border border-slate-800">
                        Growing ({Math.max(0, Math.ceil(plot.growthTimeSec - elapsed))}s left)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Hoe Upgrades (GEMS ONLY) */}
      {activeSubTab === 'hoe' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                <Gem className="w-4 h-4" />
                Hoe Upgrades (UPGRADABLE ONLY WITH GEMS)
              </h3>
              <p className="text-xs text-amber-300 mt-1 font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                CRITICAL RULE: Farming Hoes CANNOT be upgraded using Gold coins! ONLY GEMS can upgrade Hoes!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOE_TIERS.map((hoe) => {
              const isCurrent = resources.hoeTier === hoe.tier;
              const isUnlocked = resources.hoeTier >= hoe.tier;
              const isNextToUnlock = resources.hoeTier + 1 === hoe.tier;
              const canAfford = resources.gems >= hoe.gemCost;

              return (
                <div
                  key={hoe.tier}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${
                    isCurrent
                      ? 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-950/40'
                      : isUnlocked
                      ? 'bg-slate-950/60 border-slate-800 opacity-80'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                        TIER {hoe.tier}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          EQUIPPED
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-slate-100">{hoe.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{hoe.desc}</p>
                    <div className="mt-2 text-sm font-mono font-black text-emerald-400">
                      Crop Yield: {hoe.mult}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    {hoe.gemCost > 0 ? (
                      <div className="flex items-center gap-1 text-cyan-400 font-mono font-bold text-xs">
                        <Gem className="w-4 h-4" />
                        <span>{hoe.gemCost} Gems</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">Free Starter</span>
                    )}

                    {isUnlocked ? (
                      <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Unlocked
                      </span>
                    ) : isNextToUnlock ? (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          sound.playLevelUp();
                          onUpgradeHoeWithGems(hoe.gemCost, hoe.tier);
                          showNotice(`✨ Upgraded Hoe to ${hoe.name}! Crop Yield is now ${hoe.mult}!`);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:scale-105 active:scale-95 shadow-lg'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        Upgrade Hoe ({hoe.gemCost} Gems)
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-slate-600">Locked (Upgrade Previous Tier First)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Hoe Quests */}
      {activeSubTab === 'quests' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Agriculture & Hoe Quests
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Complete farming milestones and hoe achievements to earn massive Gem rewards!
            </p>
          </div>

          <div className="space-y-3">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                    <span>{quest.title}</span>
                    {quest.completed && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        COMPLETED
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{quest.description}</p>
                  <div className="text-xs font-mono text-slate-500 mt-1">
                    Progress: {Math.min(quest.targetCount, quest.currentCount)} / {quest.targetCount}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-cyan-400 font-mono font-bold text-xs">
                    <Gem className="w-4 h-4" />
                    <span>+{quest.rewardGems} Gems</span>
                  </div>

                  <button
                    disabled={!quest.completed}
                    onClick={() => {
                      sound.playLevelUp();
                      onClaimQuestReward(quest.id, quest.rewardGems);
                      showNotice(`🏆 Quest Completed! Received +${quest.rewardGems} Gems!`);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      quest.completed
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:scale-105 active:scale-95 shadow-lg'
                        : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    Claim Reward
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 4: Farm Animal Bosses */}
      {activeSubTab === 'bosses' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-900/40">
            <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Farm Animal Boss Arena
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Giant farm animals with huge HP! Bosses deal automatic damage to your Hero during battle. Strike them down for massive Gold & Gems!
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {bosses.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setSelectedBossIndex(idx)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                  selectedBossIndex === idx
                    ? 'bg-rose-500 text-slate-950 font-black shadow-lg'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                <span>{b.emoji}</span>
                <span>{b.name}</span>
              </button>
            ))}
          </div>

          {/* Active Boss Display */}
          {bosses[selectedBossIndex] && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-900/60 text-center space-y-4 relative overflow-hidden">
              <div className="text-6xl my-2 animate-bounce">{bosses[selectedBossIndex].emoji}</div>

              <div>
                <h3 className="text-xl font-black text-slate-100">{bosses[selectedBossIndex].name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Level {bosses[selectedBossIndex].level} Boss | Auto-Attack: {bosses[selectedBossIndex].attackDmg} DMG / 2.5s
                </p>
              </div>

              {/* Boss HP Bar */}
              <div className="max-w-md mx-auto space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold">BOSS HEALTH</span>
                  <span className="text-slate-300">
                    {bosses[selectedBossIndex].currentHp.toLocaleString()} / {bosses[selectedBossIndex].maxHp.toLocaleString()} HP
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 transition-all duration-200"
                    style={{
                      width: `${Math.max(0, (bosses[selectedBossIndex].currentHp / bosses[selectedBossIndex].maxHp) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={bosses[selectedBossIndex].currentHp <= 0}
                  onClick={handleHitBoss}
                  className={`w-full max-w-md py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    bosses[selectedBossIndex].currentHp > 0
                      ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-slate-950 hover:scale-102 active:scale-98 shadow-xl shadow-rose-950/50'
                      : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Sword className="w-4 h-4" />
                  <span>
                    {bosses[selectedBossIndex].currentHp > 0 ? 'ATTACK BOSS' : 'BOSS DEFEATED!'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
