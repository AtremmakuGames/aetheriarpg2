import React, { useState } from 'react';
import { EQUIPMENT_CATALOG } from '../data/gameData';
import { getQualityInfo } from '../data/forgeData';
import { PromoRewards, getLocallyRedeemedCodes, normalizePromoCode, promoErrorMessage, redeemPromoCode } from '../lib/promoCodes';
import { sound } from '../audio';
import { Coins, Gem, Gift, Package, Ticket } from 'lucide-react';

interface CodesPanelProps {
  onRedeemRewards: (rewards: PromoRewards) => void;
}

export const RewardList: React.FC<{ rewards: PromoRewards }> = ({ rewards }) => (
  <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
    {rewards.gold > 0 && (
      <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 flex items-center gap-1">
        <Coins className="w-3 h-3" /> {rewards.gold.toLocaleString()} gold
      </span>
    )}
    {rewards.gems > 0 && (
      <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 flex items-center gap-1">
        <Gem className="w-3 h-3" /> {rewards.gems.toLocaleString()} gems
      </span>
    )}
    {rewards.items.map((it, i) => {
      const recipe = EQUIPMENT_CATALOG.find((r) => r.id === it.recipeId);
      const quality = getQualityInfo(it.quality);
      return (
        <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1">
          <Package className="w-3 h-3" />
          <span className={quality.color}>{quality.label}</span> {recipe?.name || it.recipeId}
        </span>
      );
    })}
  </div>
);

export const CodesPanel: React.FC<CodesPanelProps> = ({ onRedeemRewards }) => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReward, setLastReward] = useState<{ code: string; rewards: PromoRewards } | null>(null);
  const [redeemed, setRedeemed] = useState<string[]>(getLocallyRedeemedCodes);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizePromoCode(input);
    if (!code || busy) return;

    sound.playClick();
    setBusy(true);
    setError(null);
    setLastReward(null);
    try {
      const rewards = await redeemPromoCode(code);
      onRedeemRewards(rewards);
      sound.playLevelUp();
      setLastReward({ code, rewards });
      setRedeemed(getLocallyRedeemedCodes());
      setInput('');
    } catch (err: any) {
      setError(promoErrorMessage(err, 'Could not redeem this code.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 max-w-xl mx-auto">
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
        <Ticket className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-lg font-black text-slate-100">Promo Codes</h2>
          <p className="text-xs text-slate-400">Enter a code to claim gold, gems or gear. Each code works once per hero.</p>
        </div>
      </div>

      <form onSubmit={handleRedeem} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ENTER CODE"
          maxLength={24}
          autoComplete="off"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold uppercase tracking-widest text-slate-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-4 rounded-xl bg-emerald-500 text-slate-950 text-sm font-black flex items-center gap-1.5 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Gift className="w-4 h-4" /> {busy ? 'Checking…' : 'Redeem'}
        </button>
      </form>

      {error && <p className="text-xs font-bold text-rose-400">{error}</p>}

      {lastReward && (
        <div className="bg-emerald-950/30 border border-emerald-700/60 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-black text-emerald-300">
            Code <span className="font-mono">{lastReward.code}</span> redeemed!
          </p>
          <RewardList rewards={lastReward.rewards} />
          {lastReward.rewards.items.length > 0 && (
            <p className="text-[10px] text-slate-400">Items were added to your inventory.</p>
          )}
        </div>
      )}

      {redeemed.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-slate-500 mb-1.5">Redeemed on this device</p>
          <div className="flex flex-wrap gap-1.5">
            {redeemed.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
