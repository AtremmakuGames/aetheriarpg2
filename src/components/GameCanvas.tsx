import React, { useRef, useEffect, useState } from 'react';
import { Character, GatheringNode, GatheringZone, Resources, SkillNode } from '../types';
import { sound } from '../audio';
import { Zap, Flame, Wind, Coins, Sparkles, Crosshair, Shield, Award, Lock, HelpCircle } from 'lucide-react';

interface GameCanvasProps {
  zone: GatheringZone;
  character: Character;
  resources: Resources;
  skills: SkillNode[];
  onHarvestNode: (node: GatheringNode, isCritical: boolean, bonusMultiplier: number) => void;
  onCastSkill: (skill: SkillNode) => void;
  onUnlockSkill?: (skillId: string) => void;
  onTravelPortal?: (destinationZoneId: string) => void;
  onUseHealingPotion?: () => void;
  activeZoneId: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  isCrit: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  zone,
  character,
  resources,
  skills,
  onHarvestNode,
  onCastSkill,
  onUnlockSkill,
  onTravelPortal,
  onUseHealingPotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hero Max & Current HP
  const armorVitality = character.equipped.armor?.statBonus.vitality || 0;
  const maxHeroHp = 100 + (character.attributes.vitality + armorVitality) * 25;
  const [heroHp, setHeroHp] = useState<number>(maxHeroHp);

  // Keep Hero HP synced on maxHp changes or level up
  useEffect(() => {
    setHeroHp(maxHeroHp);
  }, [character.level, character.attributes.vitality]);

  // Canvas nodes state
  const [nodes, setNodes] = useState<GatheringNode[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [precisionAngle, setPrecisionAngle] = useState<number>(0);
  const [activeCombo, setActiveCombo] = useState<number>(0);
  const [skillNotice, setSkillNotice] = useState<string | null>(null);

  // Particles ref for 60fps loop
  const particlesRef = useRef<Particle[]>([]);

  // Initialize node positions whenever zone changes
  useEffect(() => {
    const defaultPositions = [
      { x: 18, y: 48 },
      { x: 38, y: 36 },
      { x: 62, y: 58 },
      { x: 82, y: 42 },
      { x: 50, y: 72 },
    ];

    const initialNodes: GatheringNode[] = zone.nodes.map((n, idx) => ({
      ...n,
      currentHp: n.maxHp,
      x: n.defaultX ?? defaultPositions[idx % defaultPositions.length].x,
      y: n.defaultY ?? defaultPositions[idx % defaultPositions.length].y,
    }));

    setNodes(initialNodes);
  }, [zone]);

  // Main 60FPS Game Loop for Canvas Particle rendering & precision angle
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle High-DPI canvas sizing
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Render Ambient Background Particles (Ember/Dust/Mana)
      if (Math.random() < 0.3) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: h + 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 1.5 + 0.5),
          color: zone.zoneColor || '#38bdf8',
          size: Math.random() * 3 + 1,
          life: 0,
          maxLife: 120 + Math.random() * 60,
        });
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return p.life < p.maxLife;
      });
      ctx.globalAlpha = 1.0;

      // Rotate Precision Hit Minigame Ring Angle smoothly (3.5 deg per frame)
      setPrecisionAngle((prev) => (prev + 3.5) % 360);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [zone]);

  // Spawn floating text popups with smooth auto-fade and cleanup
  const spawnFloatingText = (text: string, xPx: number, yPx: number, isCrit: boolean = false, color?: string) => {
    const textId = Math.random().toString();
    setFloatingTexts((prev) => [
      ...prev,
      {
        id: textId,
        text,
        x: xPx,
        y: yPx,
        color: color || (isCrit ? '#fbbf24' : '#38bdf8'),
        life: 0,
        isCrit,
      },
    ]);

    // Automatically clean up text from state after 2.8 seconds
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== textId));
    }, 2800);
  };

  // Handle clicking on a gathering node, mob, or portal
  const handleNodeClick = (node: GatheringNode, event: React.MouseEvent<HTMLDivElement>) => {
    // 1. Handle Portal Node Interactions
    if (node.isPortal) {
      if (node.id === 'dimensional_void_portal') {
        if (character.level < 30) {
          sound.playClick();
          setSkillNotice(`🔒 Void Portal Locked! Hero Level 30 Required (Your Level: ${character.level})`);
          spawnFloatingText(
            `🔒 REQUIRES LEVEL 30`,
            event.clientX,
            event.clientY,
            true,
            '#f43f5e'
          );
          setTimeout(() => setSkillNotice(null), 3500);
          return;
        } else {
          sound.playSkillCast();
          spawnBurstParticles(event.clientX, event.clientY, '#a855f7', 45);
          setSkillNotice('🌀 Teleporting into Infernal Nether Realm...');
          if (onTravelPortal) onTravelPortal('infernal_caverns');
          return;
        }
      } else if (node.id.startsWith('nether_return_portal')) {
        sound.playSkillCast();
        spawnBurstParticles(event.clientX, event.clientY, '#38bdf8', 45);
        setSkillNotice('🌀 Returning to Mortal Realm (Dragonic Highlands)...');
        if (onTravelPortal) onTravelPortal('dragon_crag');
        return;
      }
    }

    // 2. Handle Regular Gathering / Hostile Mob Combat
    sound.playGather();

    // Sweet spot timing check: top region (between 335 deg and 25 deg)
    const isSweetSpot = precisionAngle <= 25 || precisionAngle >= 335;
    const isCrit = isSweetSpot || Math.random() < (character.attributes.luck * 0.02);
    const multiplier = isCrit ? 3 : 1;

    if (isCrit) {
      sound.playGather(true);
      setActiveCombo((c) => c + 1);
      spawnBurstParticles(event.clientX, event.clientY, '#f59e0b', 22);
    } else {
      spawnBurstParticles(event.clientX, event.clientY, node.color, 12);
    }

    // Calculate player damage
    const playerDamage =
      character.attributes.strength * 2.5 +
      character.attributes.agility * 2 +
      character.attributes.intelligence * 1.5;
    const newHp = Math.max(0, node.currentHp - playerDamage);

    // Calculate position relative to game container
    const containerRect = containerRef.current?.getBoundingClientRect();
    const floatingX = containerRect ? event.clientX - containerRect.left : (node.x / 100) * 400;
    const floatingY = containerRect ? event.clientY - containerRect.top - 10 : (node.y / 100) * 300;

    // Handle Hostile Mob Counter-Attack
    if (node.isMob) {
      const rawMobDmg = node.mobAttack || 25;
      const armorDef = character.equipped.armor?.statBonus.vitality || 0;
      const mobDmgToHero = Math.max(5, Math.floor(rawMobDmg - armorDef * 0.5));

      setHeroHp((prevHp) => {
        const nextHp = Math.max(0, prevHp - mobDmgToHero);
        if (nextHp <= 0) {
          sound.playClick();
          setSkillNotice('🛡️ Hero was defeated in battle! Respawned safely with full HP.');
          setTimeout(() => {
            setSkillNotice(null);
            setHeroHp(maxHeroHp);
          }, 2500);
          return maxHeroHp;
        }
        return nextHp;
      });

      // Show red damage text on hero avatar
      spawnFloatingText(`- ${mobDmgToHero} HP`, 80, containerRect ? containerRect.height - 70 : 380, true, '#ef4444');
    }

    const extraGearYield = character.equipped.weapon?.statBonus.extraYield || 0;
    let classBonus = 1.0;
    if (character.heroClass === 'warrior' && (node.type === 'iron' || node.type === 'stone')) classBonus = 1.25;
    if (character.heroClass === 'mage' && (node.type === 'arcaneDust' || node.type === 'crystal')) classBonus = 1.25;
    if (character.heroClass === 'ranger' && node.type === 'wood') classBonus = 1.30;

    const yieldAmount = Math.floor(
      (node.resourceYield + extraGearYield) *
        (1 + character.attributes.gatheringSpeed * 0.02) *
        multiplier *
        classBonus
    );
    const xpGained = Math.floor(25 * multiplier);

    if (node.isMob) {
      spawnFloatingText(
        isCrit
          ? `⚔️ CRIT HIT! -${Math.floor(playerDamage)} DMG (+${yieldAmount} ${node.type.toUpperCase()})`
          : `⚔️ HIT! -${Math.floor(playerDamage)} DMG (+${yieldAmount} ${node.type.toUpperCase()})`,
        floatingX,
        floatingY,
        isCrit,
        isCrit ? '#fbbf24' : '#f43f5e'
      );
    } else {
      spawnFloatingText(
        isCrit
          ? `🎯 SWEET SPOT! +${yieldAmount} ${node.type.toUpperCase()} (+${xpGained} XP)`
          : `+${yieldAmount} ${node.type.toUpperCase()} (+${xpGained} XP)`,
        floatingX,
        floatingY,
        isCrit,
        isCrit ? '#fbbf24' : '#38bdf8'
      );
    }

    // Trigger parent state harvest (awards resources, XP, gold, achievements)
    onHarvestNode(node, isCrit, multiplier);

    // Update Node / Mob local HP / Respawn logic
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === node.id) {
          if (newHp <= 0) {
            if (node.isMob) {
              spawnBurstParticles(event.clientX, event.clientY, '#f59e0b', 35);
              spawnFloatingText(`☠️ MOB SLAIN! +${yieldAmount * 2} REWARDS`, floatingX, floatingY - 20, true, '#facc15');
            }
            setTimeout(() => {
              setNodes((latest) =>
                latest.map((item) => (item.id === node.id ? { ...item, currentHp: item.maxHp } : item))
              );
            }, node.respawnTimeMs);
            return { ...n, currentHp: 0 };
          }
          return { ...n, currentHp: newHp };
        }
        return n;
      })
    );
  };

  const spawnBurstParticles = (clientX: number, clientY: number, color: string, count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: 45 + Math.random() * 20,
      });
    }
  };

  // Handle Casting Skills with visual effects & canvas node harvesting
  const handleSkillClick = (skill: SkillNode) => {
    if (!skill.unlocked) {
      if (character.skillPoints >= skill.costPoints && onUnlockSkill) {
        sound.playLevelUp();
        onUnlockSkill(skill.id);
        setSkillNotice(`✨ Skill "${skill.name}" Unlocked!`);
        setTimeout(() => setSkillNotice(null), 3000);
      } else {
        sound.playClick();
        setSkillNotice(`🔒 Unlock "${skill.name}" in Skill Matrix tab (Req: ${skill.costPoints} Skill Pts)`);
        setTimeout(() => setSkillNotice(null), 3000);
      }
      return;
    }

    if (skill.currentCooldown > 0) return;

    sound.playSkillCast();
    onCastSkill(skill);

    const containerRect = containerRef.current?.getBoundingClientRect();
    const width = containerRect ? containerRect.width : 500;
    const height = containerRect ? containerRect.height : 380;

    // Trigger floating texts and particle bursts for all active nodes harvested by skill
    nodes.forEach((node) => {
      if (node.currentHp > 0) {
        const xPx = (node.x / 100) * width;
        const yPx = (node.y / 100) * height;

        const mult = skill.id === 'time_dilation' ? 3 : skill.id === 'meteor_strike' ? 2.5 : 2;
        const extraGearYield = character.equipped.weapon?.statBonus.extraYield || 0;
        let classBonus = 1.0;
        if (character.heroClass === 'warrior' && (node.type === 'iron' || node.type === 'stone')) classBonus = 1.25;
        if (character.heroClass === 'mage' && (node.type === 'arcaneDust' || node.type === 'crystal')) classBonus = 1.25;
        if (character.heroClass === 'ranger' && node.type === 'wood') classBonus = 1.30;

        const yieldAmount = Math.floor((node.resourceYield + extraGearYield) * (1 + character.attributes.gatheringSpeed * 0.02) * mult * classBonus);
        const xpGained = Math.floor(15 * mult);

        spawnFloatingText(
          `⚡ ${skill.name.toUpperCase()}! +${yieldAmount} ${node.type.toUpperCase()} (+${xpGained} XP)`,
          xPx,
          yPx,
          true,
          '#f59e0b'
        );

        spawnBurstParticles(
          containerRect ? containerRect.left + xPx : xPx,
          containerRect ? containerRect.top + yPx : yPx,
          node.color,
          22
        );
      }
    });

    // Damage all current nodes on canvas to 0
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        currentHp: 0,
      }))
    );

    // Respawn nodes after 2.5s
    setTimeout(() => {
      setNodes((prev) => prev.map((n) => ({ ...n, currentHp: n.maxHp })));
    }, 2500);
  };

  const isSweetSpotNow = precisionAngle <= 25 || precisionAngle >= 335;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[380px] sm:h-[460px] bg-gradient-to-b ${zone.bgGradient} overflow-hidden rounded-2xl shadow-2xl select-none border border-slate-800`}
    >
      {/* 60FPS Canvas Overlay for Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Floating Animated Zone Header Info */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-3 bg-slate-950/80 backdrop-blur border border-slate-800 p-2 px-3 rounded-xl shadow-lg">
        <div
          className="w-3 h-3 rounded-full animate-ping"
          style={{ backgroundColor: zone.zoneColor }}
        ></div>
        <div>
          <h2 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
            <span>{zone.name}</span>
            <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
              Req. Lvl {zone.requiredLevel}
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">{zone.description}</p>
        </div>
      </div>

      {/* Skill Unlock / Toast Notification */}
      {skillNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 border border-amber-500/60 text-amber-300 font-extrabold text-xs px-4 py-2 rounded-xl shadow-2xl animate-bounce backdrop-blur">
          {skillNotice}
        </div>
      )}

      {/* Centered Precision Ring Timing Wheel (Top Right) */}
      <div className="absolute top-3 right-4 z-20 bg-slate-950/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex items-center gap-3">
        <div className="relative w-12 h-12 flex items-center justify-center bg-slate-950 rounded-full border border-slate-800">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/80"></div>
          
          {/* Target Sweet Spot Highlight at 12 o'clock (Top: 335° to 25°) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2.5 bg-amber-400 rounded-b-full shadow-[0_0_10px_#f59e0b] z-10"></div>
          
          {/* Center Pivot Point */}
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 shadow-[0_0_8px_#38bdf8]"></div>
          
          {/* Rotating Needle - Pivot centered at (50%, 100%) */}
          <div
            className="absolute w-1 h-5 bg-gradient-to-t from-cyan-400 to-amber-300 rounded-full shadow-[0_0_8px_#38bdf8] pointer-events-none"
            style={{
              left: 'calc(50% - 2px)',
              bottom: '50%',
              transformOrigin: '50% 100%',
              transform: `rotate(${precisionAngle}deg)`,
            }}
          ></div>
          <Crosshair className="w-4 h-4 text-slate-600 z-10 opacity-40" />
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Precision Ring
          </div>
          <div className={`text-xs font-black ${isSweetSpotNow ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
            {isSweetSpotNow ? '🎯 SWEET SPOT (3X)!' : 'Tap Resource'}
          </div>
        </div>
      </div>

      {/* Character Hero Avatar Sprite on Canvas (Left/Center) */}
      <div className="absolute bottom-4 left-4 sm:left-8 z-20 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 to-indigo-500/30 rounded-full blur-md animate-pulse"></div>

          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-amber-400/80 shadow-2xl flex items-center justify-center text-2xl sm:text-3xl bg-slate-900 relative z-10 transition-transform transform group-hover:scale-105"
            style={{ backgroundColor: character.avatarColor }}
          >
            {character.heroClass === 'warrior' && '⚔️'}
            {character.heroClass === 'mage' && '🧙‍♂️'}
            {character.heroClass === 'ranger' && '🏹'}
            {character.heroClass === 'alchemist' && '🧪'}
          </div>

          <div className="absolute -bottom-2 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-300 z-20">
            Lvl {character.level}
          </div>
        </div>

        <span className="mt-1.5 text-xs font-bold text-slate-200 tracking-wide bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800">
          {character.name}
        </span>

        {/* Hero Health Bar */}
        <div className="w-24 sm:w-28 mt-1.5 bg-slate-950/90 border border-slate-800 p-1 rounded-lg shadow-md flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-[9px] font-mono text-slate-300 font-extrabold px-1 mb-0.5">
            <span className="text-rose-400">HERO HP</span>
            <span>{Math.floor(heroHp)}/{maxHeroHp}</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${(heroHp / maxHeroHp) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Interactive Resource Gathering Nodes, Portals, and Hostile Mobs on Field */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {nodes.map((node) => {
          const isDestroyed = node.currentHp <= 0;

          if (node.isPortal) {
            const isLockedPortal = node.id === 'dimensional_void_portal' && character.level < 30;

            return (
              <div
                key={node.id}
                onClick={(e) => handleNodeClick(node, e)}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {/* Portal Swirling Energy Aura */}
                <div
                  className={`absolute -inset-6 rounded-full blur-lg opacity-70 animate-pulse ${
                    isLockedPortal ? 'bg-rose-600/40' : 'bg-purple-600/60 shadow-[0_0_20px_#a855f7]'
                  }`}
                ></div>

                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 bg-slate-950/90 backdrop-blur shadow-2xl flex flex-col items-center justify-center relative z-10 p-2 ${
                    isLockedPortal
                      ? 'border-rose-500/80 text-rose-300'
                      : 'border-purple-400 text-purple-200 animate-spin-slow ring-2 ring-purple-500/50'
                  }`}
                >
                  <div className="text-3xl mb-0.5 animate-bounce">
                    {isLockedPortal ? '🔒' : '🌀'}
                  </div>
                  <div className="text-[10px] font-black text-center text-slate-100 truncate max-w-full px-1">
                    {node.name}
                  </div>
                  <div
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 ${
                      isLockedPortal
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                        : 'bg-purple-950 text-purple-300 border border-purple-500/50'
                    }`}
                  >
                    {isLockedPortal ? 'Lvl 30 Req' : 'Enter Portal'}
                  </div>
                </div>
              </div>
            );
          }

          if (node.isMob) {
            return (
              <div
                key={node.id}
                onClick={(e) => !isDestroyed && handleNodeClick(node, e)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-all duration-200 group ${
                  isDestroyed ? 'opacity-30 grayscale scale-90' : 'hover:scale-110 active:scale-95'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {/* Mob Threat Pulse Aura */}
                <div className="absolute -inset-5 rounded-full blur-md opacity-60 bg-rose-600/50 group-hover:opacity-90 transition-opacity"></div>

                {/* Mob Container */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-rose-500 bg-slate-950/90 backdrop-blur shadow-2xl flex flex-col items-center justify-center relative z-10 p-1.5">
                  <div className="text-2xl sm:text-3xl mb-0.5 animate-pulse">
                    {node.mobEmoji || '👾'}
                  </div>
                  <div className="text-[10px] font-extrabold text-rose-200 truncate max-w-full">
                    {node.name}
                  </div>

                  <div className="flex items-center gap-1 text-[8px] font-mono text-amber-300 font-bold my-0.5">
                    <span>Lvl {node.mobLevel}</span>
                    <span>•</span>
                    <span className="text-rose-400">⚔️ {node.mobAttack}</span>
                  </div>

                  {/* Mob HP Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-150"
                      style={{ width: `${(node.currentHp / node.maxHp) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={node.id}
              onClick={(e) => !isDestroyed && handleNodeClick(node, e)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-all duration-200 group ${
                isDestroyed ? 'opacity-30 grayscale scale-90' : 'hover:scale-110 active:scale-95'
              }`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* Node Pulse Aura */}
              <div
                className="absolute -inset-4 rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity"
                style={{ backgroundColor: node.color }}
              ></div>

              {/* Node Main Icon Container */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-700 bg-slate-900/90 backdrop-blur shadow-2xl flex flex-col items-center justify-center relative z-10 p-2"
                style={{ borderColor: node.color }}
              >
                <div className="text-2xl mb-1">
                  {node.type === 'wood' && '🌲'}
                  {node.type === 'stone' && '🪨'}
                  {node.type === 'iron' && '⛏️'}
                  {node.type === 'mythril' && '🔮'}
                  {node.type === 'crystal' && '💎'}
                  {node.type === 'arcaneDust' && '✨'}
                  {node.type === 'flameGem' && '🔥'}
                  {node.type === 'dragonScale' && '🐉'}
                  {node.type === 'voidShard' && '🌌'}
                  {node.type === 'herbs' && '🌿'}
                  {node.type === 'ruby' && '🔻'}
                  {node.type === 'emerald' && '🟢'}
                  {node.type === 'obsidian' && '⬛'}
                  {node.type === 'starlight' && '⭐'}
                  {node.type === 'ether' && '💫'}
                </div>
                <div className="text-[10px] font-extrabold text-slate-200 truncate max-w-full">
                  {node.name}
                </div>

                {/* HP Progress Bar */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full mt-1 overflow-hidden border border-slate-800">
                  <div
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${(node.currentHp / node.maxHp) * 100}%`,
                      backgroundColor: node.color,
                    }}
                  ></div>
                </div>
              </div>

              {/* Active Tap Sweet Spot Glow Ring */}
              {isSweetSpotNow && !isDestroyed && (
                <div className="absolute -inset-2 border-2 border-amber-400 rounded-3xl animate-ping opacity-80 pointer-events-none"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Damage & Resource Numbers */}
      {floatingTexts.map((item) => (
        <div
          key={item.id}
          className={`absolute pointer-events-none font-black z-30 animate-float-fade whitespace-nowrap ${
            item.isCrit
              ? 'text-base sm:text-lg text-amber-300 drop-shadow-[0_0_12px_#f59e0b]'
              : 'text-xs sm:text-sm text-cyan-300 drop-shadow-[0_0_8px_#38bdf8]'
          }`}
          style={{ left: `${item.x}px`, top: `${item.y}px`, color: item.color }}
        >
          {item.text}
        </div>
      ))}

      {/* Quick Cast Skill Action Bar Overlay (Bottom Right) */}
      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-2 bg-slate-950/90 border border-slate-800 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline px-1">
          Abilities:
        </span>

        {/* Healing Potion Quick Drink Button */}
        {onUseHealingPotion && (
          <button
            onClick={() => {
              if ((resources.healingPotions || 0) > 0) {
                onUseHealingPotion();
                setHeroHp((prev) => Math.min(maxHeroHp, prev + 300));
                sound.playSkillCast();
              } else {
                sound.playClick();
                setSkillNotice('🧪 No Healing Potions left! Craft potions in Crafting Forge.');
                setTimeout(() => setSkillNotice(null), 2500);
              }
            }}
            className={`relative p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center ${
              (resources.healingPotions || 0) > 0
                ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer'
                : 'bg-slate-900 border-slate-800 text-slate-600 opacity-60 cursor-pointer'
            }`}
            title="Drink Healing Potion (+300 HP)"
          >
            <div className="text-lg">🧪</div>
            <span className="text-[9px] font-black mt-0.5">Heal +300</span>

            {/* Potion Counter Badge */}
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-mono text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-lg animate-pulse">
              {resources.healingPotions || 0}
            </span>
          </button>
        )}

        {skills.map((skill) => {
          const canCast = skill.unlocked && skill.currentCooldown <= 0;

          return (
            <button
              key={skill.id}
              onClick={() => handleSkillClick(skill)}
              className={`relative p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center ${
                canCast
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer'
                  : skill.unlocked
                  ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-60'
                  : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:border-amber-500/50 cursor-pointer'
              }`}
              title={skill.unlocked ? skill.description : `Click to Unlock "${skill.name}"`}
            >
              {!skill.unlocked ? (
                <Lock className="w-4 h-4 text-amber-500/80 mb-0.5" />
              ) : (
                <>
                  {skill.id === 'whirlwind_harvest' && <Wind className="w-5 h-5 text-amber-400" />}
                  {skill.id === 'meteor_strike' && <Flame className="w-5 h-5 text-red-400" />}
                  {skill.id === 'arcane_overcharge' && <Zap className="w-5 h-5 text-cyan-400" />}
                  {skill.id === 'gold_frenzy' && <Coins className="w-5 h-5 text-amber-300" />}
                  {skill.id === 'time_dilation' && <Sparkles className="w-5 h-5 text-purple-400" />}
                </>
              )}

              <span className="text-[9px] font-black mt-0.5">{skill.name.split(' ')[0]}</span>

              {skill.currentCooldown > 0 && skill.unlocked && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center text-xs font-extrabold text-amber-400">
                  {skill.currentCooldown}s
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

