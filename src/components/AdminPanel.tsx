import React, { useEffect, useState } from 'react';
import { Character, EquipmentItem, ForgeQuality, Resources } from '../types';
import { EQUIPMENT_CATALOG } from '../data/gameData';
import { FORGE_QUALITIES, createForgedItem } from '../data/forgeData';
import { sha256Hex } from '../lib/sha256';
import { sound } from '../audio';
import { KeyRound, LogOut, ShieldAlert, Coins, UserCog, Package, Wand2, Lock } from 'lucide-react';

// SHA-256 of the admin password, so the plain password is not shipped in the bundle
const ADMIN_PASSWORD_HASH = 'a04e12b639d0d1299c79961a0ec7fb54ee0b2963eaff2931820a286383d0c263';
const SESSION_KEY = 'aetheria_admin_session';
const LOCKOUT_KEY = 'aetheria_admin_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export type AdminResourceKey = Exclude<keyof Resources, 'hoeTier'>;

interface AdminPanelProps {
  character: Character;
  resources: Resources;
  onChangeResource: (key: AdminResourceKey, amount: number, mode: 'add' | 'set') => void;
  onFillAllMaterials: (amount: number) => void;
  onSetLevel: (level: number) => void;
  onGrantPoints: (statPoints: number, skillPoints: number) => void;
  onUnlockAllClasses: () => void;
  onUnlockAllSkills: () => void;
  onResetCooldowns: () => void;
  onGiveItem: (item: EquipmentItem) => void;
}

const readSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const readLockout = () => {
  try {
    return Number(localStorage.getItem(LOCKOUT_KEY)) || 0;
  } catch {
    return 0;
  }
};

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  children,
}) => (
  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-rose-400" />
      <h3 className="text-sm font-black text-slate-100">{title}</h3>
    </div>
    {children}
  </div>
);

const btn =
  'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50';
const input =
  'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  character,
  resources,
  onChangeResource,
  onFillAllMaterials,
  onSetLevel,
  onGrantPoints,
  onUnlockAllClasses,
  onUnlockAllSkills,
  onResetCooldowns,
  onGiveItem,
}) => {
  const [authed, setAuthed] = useState<boolean>(readSession);
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(readLockout);
  const [now, setNow] = useState(Date.now());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const [resKey, setResKey] = useState<AdminResourceKey>('gold');
  const [resAmount, setResAmount] = useState('1000');
  const [levelInput, setLevelInput] = useState(String(character.level));
  const [itemId, setItemId] = useState(EQUIPMENT_CATALOG[0].id);
  const [itemQuality, setItemQuality] = useState<ForgeQuality>('masterwork');

  const locked = lockedUntil > now;

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [locked]);

  const addLog = (msg: string) => {
    sound.playClick();
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 14)]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (sha256Hex(password) === ADMIN_PASSWORD_HASH) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* session persistence is optional */
      }
      sound.playLevelUp();
      setAuthed(true);
      setAttempts(0);
      setLoginError(null);
      setPassword('');
      return;
    }

    const nextAttempts = attempts + 1;
    setPassword('');
    if (nextAttempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MS;
      try {
        localStorage.setItem(LOCKOUT_KEY, String(until));
      } catch {
        /* ignore */
      }
      setLockedUntil(until);
      setNow(Date.now());
      setAttempts(0);
      setLoginError('Too many wrong attempts. Try again later.');
    } else {
      setAttempts(nextAttempts);
      setLoginError(`Wrong password (${MAX_ATTEMPTS - nextAttempts} attempts left)`);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  };

  if (!authed) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm mx-auto mt-6">
        <div className="flex flex-col items-center text-center gap-2 mb-5">
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40">
            <Lock className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-lg font-black text-slate-100">Admin Panel</h2>
          <p className="text-xs text-slate-400">Enter the admin password to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={password}
            disabled={locked}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={`${input} w-full text-center text-base tracking-[0.4em] py-2.5`}
            autoFocus
          />
          <button
            type="submit"
            disabled={locked || !password}
            className="w-full py-2.5 rounded-xl bg-rose-500 text-slate-950 text-sm font-black flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
          >
            <KeyRound className="w-4 h-4" />
            {locked ? `Locked (${Math.ceil((lockedUntil - now) / 1000)}s)` : 'Log In'}
          </button>
          {loginError && <p className="text-xs text-rose-400 font-bold text-center">{loginError}</p>}
        </form>
      </div>
    );
  }

  const parsedAmount = Math.floor(Number(resAmount));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const resourceKeys = (Object.keys(resources) as (keyof Resources)[]).filter(
    (k): k is AdminResourceKey => k !== 'hoeTier'
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
          <div>
            <h2 className="text-lg font-black text-slate-100">Admin Panel</h2>
            <p className="text-xs text-slate-400">Edit this save's resources, hero and items</p>
          </div>
        </div>
        <button onClick={handleLogout} className={`${btn} flex items-center gap-1.5`}>
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section icon={Coins} title="Resources">
          <div className="flex flex-wrap gap-2">
            <select
              value={resKey}
              onChange={(e) => setResKey(e.target.value as AdminResourceKey)}
              className={input}
            >
              {resourceKeys.map((k) => (
                <option key={k} value={k}>
                  {k} ({resources[k].toLocaleString()})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={resAmount}
              onChange={(e) => setResAmount(e.target.value)}
              className={`${input} w-28`}
            />
            <button
              disabled={!amountValid}
              className={btn}
              onClick={() => {
                onChangeResource(resKey, parsedAmount, 'add');
                addLog(`+${parsedAmount} ${resKey}`);
              }}
            >
              Add
            </button>
            <button
              disabled={!amountValid}
              className={btn}
              onClick={() => {
                onChangeResource(resKey, parsedAmount, 'set');
                addLog(`${resKey} set to ${parsedAmount}`);
              }}
            >
              Set
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => { onChangeResource('gold', 100000, 'add'); addLog('+100,000 gold'); }}>
              +100k Gold
            </button>
            <button className={btn} onClick={() => { onChangeResource('gems', 5000, 'add'); addLog('+5,000 gems'); }}>
              +5k Gems
            </button>
            <button className={btn} onClick={() => { onFillAllMaterials(1000); addLog('+1,000 of every material'); }}>
              +1k All Materials
            </button>
            <button className={btn} onClick={() => { onChangeResource('hunger', 100, 'set'); addLog('Hunger refilled'); }}>
              Full Hunger
            </button>
            <button className={btn} onClick={() => { onChangeResource('healingPotions', 10, 'add'); addLog('+10 healing potions'); }}>
              +10 Potions
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Values are capped (gems 50,000 · gold 50,000,000) to match the save sanitizer.
          </p>
        </Section>

        <Section icon={UserCog} title="Hero">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400">Level</span>
            <input
              type="number"
              min={1}
              max={999}
              value={levelInput}
              onChange={(e) => setLevelInput(e.target.value)}
              className={`${input} w-20`}
            />
            <button
              className={btn}
              onClick={() => {
                const lvl = Math.min(999, Math.max(1, Math.floor(Number(levelInput)) || 1));
                onSetLevel(lvl);
                addLog(`Level set to ${lvl}`);
              }}
            >
              Set Level
            </button>
            <span className="text-[11px] text-slate-500">current: {character.level}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => { onGrantPoints(10, 0); addLog('+10 stat points'); }}>
              +10 Stat Points
            </button>
            <button className={btn} onClick={() => { onGrantPoints(0, 5); addLog('+5 skill points'); }}>
              +5 Skill Points
            </button>
            <button className={btn} onClick={() => { onUnlockAllClasses(); addLog('All classes unlocked'); }}>
              Unlock All Classes
            </button>
          </div>
        </Section>

        <Section icon={Package} title="Give Item">
          <div className="flex flex-wrap gap-2">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={`${input} flex-1 min-w-[10rem]`}>
              {EQUIPMENT_CATALOG.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.rarity})
                </option>
              ))}
            </select>
            <select
              value={itemQuality}
              onChange={(e) => setItemQuality(e.target.value as ForgeQuality)}
              className={input}
            >
              {FORGE_QUALITIES.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
            <button
              className={btn}
              onClick={() => {
                const recipe = EQUIPMENT_CATALOG.find((i) => i.id === itemId);
                if (!recipe) return;
                const item = createForgedItem(recipe, itemQuality);
                onGiveItem(item);
                addLog(`Gave ${item.name}`);
              }}
            >
              Give
            </button>
          </div>
        </Section>

        <Section icon={Wand2} title="Skills">
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => { onUnlockAllSkills(); addLog('All skills unlocked'); }}>
              Unlock All Skills
            </button>
            <button className={btn} onClick={() => { onResetCooldowns(); addLog('Skill cooldowns reset'); }}>
              Reset Cooldowns
            </button>
          </div>
        </Section>
      </div>

      {log.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-40 overflow-y-auto">
          {log.map((l, i) => (
            <p key={i} className="text-[11px] font-mono text-slate-400">
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
