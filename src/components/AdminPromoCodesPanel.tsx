import React, { useEffect, useState } from 'react';
import { ForgeQuality } from '../types';
import { EQUIPMENT_CATALOG } from '../data/gameData';
import { FORGE_QUALITIES } from '../data/forgeData';
import {
  PROMO_MAX_ACTIVATIONS,
  PROMO_MAX_GEMS,
  PROMO_MAX_GOLD,
  PROMO_MAX_ITEMS,
  PromoCode,
  PromoItemReward,
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminFetchPromoCodes,
  adminSetPromoActive,
  isValidPromoCode,
  normalizePromoCode,
  promoErrorMessage,
} from '../lib/promoCodes';
import { RewardList } from './CodesPanel';
import { sound } from '../audio';
import { Plus, Power, RefreshCw, Ticket, Trash2, X } from 'lucide-react';

const btn =
  'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50';
const input =
  'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500';

const clampInt = (value: string, max: number) => Math.min(max, Math.max(0, Math.floor(Number(value)) || 0));

export const AdminPromoCodesPanel: React.FC = () => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [gold, setGold] = useState('0');
  const [gems, setGems] = useState('0');
  const [maxActivations, setMaxActivations] = useState('10');
  const [items, setItems] = useState<PromoItemReward[]>([]);
  const [itemId, setItemId] = useState(EQUIPMENT_CATALOG[0].id);
  const [itemQuality, setItemQuality] = useState<ForgeQuality>('standard');

  const loadCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      setCodes(await adminFetchPromoCodes());
    } catch (err: any) {
      setError(promoErrorMessage(err, 'Failed to load promo codes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const runAction = async (action: () => Promise<void>, successText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      sound.playCraft();
      setNotice(successText);
      await loadCodes();
    } catch (err: any) {
      setError(promoErrorMessage(err, 'Firestore update failed.'));
    } finally {
      setBusy(false);
    }
  };

  const normalizedCode = normalizePromoCode(codeInput);
  const codeValid = isValidPromoCode(normalizedCode);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValid) {
      setError('Code must be 3–24 characters: letters, digits, "_" or "-".');
      return;
    }
    const rewards = { gold: clampInt(gold, PROMO_MAX_GOLD), gems: clampInt(gems, PROMO_MAX_GEMS), items };
    const limit = Math.max(1, clampInt(maxActivations, PROMO_MAX_ACTIVATIONS));

    runAction(async () => {
      await adminCreatePromoCode(normalizedCode, rewards, limit);
      setCodeInput('');
      setGold('0');
      setGems('0');
      setItems([]);
    }, `Code ${normalizedCode} created (${limit} activations).`);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
      {notice && <p className="text-xs font-bold text-emerald-400">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Create */}
        <form onSubmit={handleCreate} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-black text-slate-100">Create Promo Code</h3>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-400">Code</span>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="e.g. ADMINABUSE"
              maxLength={24}
              className={`${input} w-full font-mono uppercase tracking-wider`}
            />
            <span className={`text-[10px] ${codeInput && !codeValid ? 'text-rose-400' : 'text-slate-500'}`}>
              3–24 characters: A–Z, 0–9, "_" or "-". Not case-sensitive.
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-400">Gold</span>
              <input type="number" min={0} max={PROMO_MAX_GOLD} value={gold} onChange={(e) => setGold(e.target.value)} className={`${input} w-full`} />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-400">Gems</span>
              <input type="number" min={0} max={PROMO_MAX_GEMS} value={gems} onChange={(e) => setGems(e.target.value)} className={`${input} w-full`} />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-400">Activations</span>
              <input
                type="number"
                min={1}
                max={PROMO_MAX_ACTIVATIONS}
                value={maxActivations}
                onChange={(e) => setMaxActivations(e.target.value)}
                className={`${input} w-full`}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400">
              Items ({items.length}/{PROMO_MAX_ITEMS})
            </span>
            <div className="flex flex-wrap gap-2">
              <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={`${input} flex-1 min-w-[9rem]`}>
                {EQUIPMENT_CATALOG.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.rarity})
                  </option>
                ))}
              </select>
              <select value={itemQuality} onChange={(e) => setItemQuality(e.target.value as ForgeQuality)} className={input}>
                {FORGE_QUALITIES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={items.length >= PROMO_MAX_ITEMS}
                className={btn}
                onClick={() => setItems((prev) => [...prev, { recipeId: itemId, quality: itemQuality }])}
              >
                Add
              </button>
            </div>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {items.map((it, idx) => (
                  <span key={idx} className="pl-2 pr-1 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 flex items-center gap-1">
                    {FORGE_QUALITIES.find((q) => q.id === it.quality)?.label}{' '}
                    {EQUIPMENT_CATALOG.find((r) => r.id === it.recipeId)?.name}
                    <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="p-0.5 text-slate-400 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || !codeValid}
            className="w-full py-2.5 rounded-xl bg-rose-500 text-slate-950 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" /> {busy ? 'Saving…' : 'Create Code'}
          </button>
          <p className="text-[10px] text-slate-500">
            Each player can redeem a code once. Limits per code: {PROMO_MAX_GOLD.toLocaleString()} gold,{' '}
            {PROMO_MAX_GEMS.toLocaleString()} gems, {PROMO_MAX_ITEMS} items, {PROMO_MAX_ACTIVATIONS.toLocaleString()} activations.
          </p>
        </form>

        {/* Existing codes */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-black text-slate-100">Existing Codes</h3>
            </div>
            <button className={`${btn} flex items-center gap-1.5`} disabled={loading} onClick={loadCodes}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {loading && codes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Loading codes…</p>
            ) : codes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No promo codes yet.</p>
            ) : (
              codes.map((c) => {
                const used = c.activations >= c.maxActivations;
                return (
                  <div key={c.code} className={`p-3 rounded-xl border space-y-2 ${c.active && !used ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900/50 opacity-70'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-sm text-slate-100">{c.code}</span>
                      <span className={`text-[11px] font-mono font-bold ${used ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {c.activations}/{c.maxActivations}
                        {!c.active && <span className="text-amber-400 ml-1.5">disabled</span>}
                      </span>
                    </div>
                    <RewardList rewards={c} />
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        className={`${btn} flex items-center gap-1`}
                        onClick={() => runAction(() => adminSetPromoActive(c.code, !c.active), `${c.code} ${c.active ? 'disabled' : 'enabled'}.`)}
                      >
                        <Power className="w-3 h-3" /> {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        disabled={busy}
                        className={`${btn} flex items-center gap-1 text-rose-400`}
                        onClick={() => {
                          if (!window.confirm(`Delete code ${c.code}?`)) return;
                          runAction(() => adminDeletePromoCode(c.code), `${c.code} deleted.`);
                        }}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
