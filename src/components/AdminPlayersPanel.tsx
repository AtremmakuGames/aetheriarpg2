import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminPlayerPatch,
  AdminPlayerRecord,
  adminDeletePlayer,
  adminFetchPlayers,
  adminRemoveFromLeaderboard,
  adminUpdatePlayer,
} from '../lib/databaseService';
import { sound } from '../audio';
import { Check, Copy, RefreshCw, Save, Search, Trash2, UserX, Users } from 'lucide-react';

// Same caps the client applies when it loads a save, so admin values survive a reload
const MAX_GOLD = 50000000;
const MAX_GEMS = 50000;
const MAX_LEVEL = 999;

interface EditForm {
  playerName: string;
  level: string;
  gold: string;
  gems: string;
  score: string;
}

const formFromPlayer = (p: AdminPlayerRecord): EditForm => ({
  playerName: p.playerName,
  level: String(p.level),
  gold: String(p.gold),
  gems: String(p.gems),
  score: String(p.score),
});

const toInt = (value: string, min: number, max: number) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

const btn =
  'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50';
const input =
  'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-50';

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      title={`Copy ${label || value}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

export const AdminPlayersPanel: React.FC = () => {
  const [players, setPlayers] = useState<AdminPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const selected = players.find((p) => p.uid === selectedUid) || null;

  const loadPlayers = async (keepSelection = true) => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminFetchPlayers();
      setPlayers(list);
      const stillSelected = keepSelection ? list.find((p) => p.uid === selectedUid) : undefined;
      setSelectedUid(stillSelected ? stillSelected.uid : null);
      setForm(stillSelected ? formFromPlayer(stillSelected) : null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load players from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers(false);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.playerName.toLowerCase().includes(q) ||
        p.cloudCode.toLowerCase().includes(q) ||
        p.uid.toLowerCase().includes(q)
    );
  }, [players, search]);

  const selectPlayer = (p: AdminPlayerRecord) => {
    sound.playClick();
    setSelectedUid(p.uid);
    setForm(formFromPlayer(p));
    setNotice(null);
    setError(null);
  };

  const runAction = async (action: () => Promise<void>, successText: string, keepSelection = true) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      sound.playCraft();
      setNotice(successText);
      await loadPlayers(keepSelection);
    } catch (err: any) {
      setError(err?.message || 'Firestore update failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!selected || !form) return;

    const patch: AdminPlayerPatch = {};
    const name = form.playerName.trim();
    const level = toInt(form.level, 1, MAX_LEVEL);
    const gold = toInt(form.gold, 0, MAX_GOLD);
    const gems = toInt(form.gems, 0, MAX_GEMS);
    const score = toInt(form.score, 0, Number.MAX_SAFE_INTEGER);

    if (level === null || gold === null || gems === null || score === null) {
      setError('All numeric fields must be valid numbers.');
      return;
    }

    if (name && name !== selected.playerName) patch.playerName = name;
    if (level !== selected.level) patch.level = level;
    if (gold !== selected.gold) patch.gold = gold;
    if (selected.hasSave && gems !== selected.gems) patch.gems = gems;
    if (score !== selected.score) patch.score = score;

    if (Object.keys(patch).length === 0) {
      setNotice('Nothing changed.');
      return;
    }

    runAction(() => adminUpdatePlayer(selected, patch), `Saved changes for ${name || selected.playerName}.`);
  };

  const setField = (key: keyof EditForm, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const scaleField = (key: 'gold' | 'gems' | 'score', factor: number) => {
    if (!form) return;
    const current = Math.floor(Number(form[key])) || 0;
    setField(key, String(Math.max(0, Math.floor(current * factor))));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, save code or uid"
            className={`${input} w-full pl-8`}
          />
        </div>
        <button className={`${btn} flex items-center gap-1.5`} disabled={loading} onClick={() => loadPlayers()}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
      {notice && <p className="text-xs font-bold text-emerald-400">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        {/* Player list */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 max-h-[32rem] overflow-y-auto">
          {loading && players.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 text-center">Loading players…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 text-center">No players found.</p>
          ) : (
            filtered.map((p, idx) => (
              <button
                key={p.uid}
                onClick={() => selectPlayer(p)}
                className={`w-full text-left px-3 py-2 rounded-xl border mb-1.5 flex items-center gap-3 transition-all ${
                  p.uid === selectedUid ? 'bg-rose-950/30 border-rose-500/60' : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                }`}
              >
                <span className="text-[11px] font-mono font-black text-slate-500 w-6 shrink-0">#{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 truncate">{p.playerName}</span>
                    <span className="text-[10px] text-slate-500 capitalize shrink-0">{p.heroClass}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-sky-300">
                    {p.cloudCode || <span className="text-slate-600">no code</span>}
                    <CopyButton value={p.cloudCode} label="save code" />
                    {!p.onLeaderboard && <span className="text-amber-400 ml-1">hidden</span>}
                    {!p.hasSave && <span className="text-slate-500 ml-1">no save</span>}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono leading-tight shrink-0">
                  <div className="text-amber-300 font-bold">{p.score.toLocaleString()} pts</div>
                  <div className="text-slate-400">
                    Lv {p.level} · {p.gold.toLocaleString()}g · {p.gems.toLocaleString()}💎
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          {!selected || !form ? (
            <div className="h-full min-h-[10rem] flex flex-col items-center justify-center gap-2 text-slate-500">
              <Users className="w-6 h-6" />
              <p className="text-xs">Select a player to manage their account</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-slate-100">{selected.playerName}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <span className="text-slate-400">Save code:</span>
                  <span className="font-mono font-black text-sky-300 text-sm">{selected.cloudCode || '—'}</span>
                  <CopyButton value={selected.cloudCode} label="save code" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  uid: <span className="truncate">{selected.uid}</span>
                  <CopyButton value={selected.uid} label="uid" />
                </div>
                {selected.updatedAt && (
                  <p className="text-[10px] text-slate-500">
                    Last sync: {new Date(selected.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Nickname</span>
                <input value={form.playerName} onChange={(e) => setField('playerName', e.target.value)} className={`${input} w-full`} />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Level</span>
                  <input type="number" min={1} max={MAX_LEVEL} value={form.level} onChange={(e) => setField('level', e.target.value)} className={`${input} w-full`} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Score</span>
                  <input type="number" min={0} value={form.score} onChange={(e) => setField('score', e.target.value)} className={`${input} w-full`} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Gold</span>
                  <input type="number" min={0} max={MAX_GOLD} value={form.gold} onChange={(e) => setField('gold', e.target.value)} className={`${input} w-full`} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Gems</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_GEMS}
                    disabled={!selected.hasSave}
                    title={selected.hasSave ? undefined : 'This player has no cloud save'}
                    value={form.gems}
                    onChange={(e) => setField('gems', e.target.value)}
                    className={`${input} w-full`}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button className={btn} onClick={() => scaleField('score', 0.5)}>Score −50%</button>
                <button className={btn} onClick={() => setField('score', '0')}>Score → 0</button>
                <button className={btn} onClick={() => scaleField('gold', 0.5)}>Gold −50%</button>
                <button className={btn} onClick={() => setField('gold', '0')}>Gold → 0</button>
                {selected.hasSave && (
                  <button className={btn} onClick={() => setField('gems', '0')}>Gems → 0</button>
                )}
                <button className={btn} onClick={() => setForm(formFromPlayer(selected))}>Undo edits</button>
              </div>

              <button
                disabled={busy}
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-rose-500 text-slate-950 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save Changes'}
              </button>

              <p className="text-[10px] text-slate-500">
                Changes apply to the cloud save immediately; the player's game picks them up on their next cloud sync. Gold is capped at{' '}
                {MAX_GOLD.toLocaleString()}, gems at {MAX_GEMS.toLocaleString()}.
              </p>

              <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                {selected.onLeaderboard && (
                  <button
                    disabled={busy}
                    className={`${btn} flex items-center gap-1.5 text-amber-300`}
                    onClick={() => {
                      if (!window.confirm(`Remove ${selected.playerName} from the leaderboard? It reappears if they sync again.`)) return;
                      runAction(() => adminRemoveFromLeaderboard(selected.uid), `${selected.playerName} removed from the leaderboard.`);
                    }}
                  >
                    <UserX className="w-3.5 h-3.5" /> Remove from Leaderboard
                  </button>
                )}
                <button
                  disabled={busy}
                  className={`${btn} flex items-center gap-1.5 text-rose-400 border-rose-900`}
                  onClick={() => {
                    if (!window.confirm(`Permanently delete ${selected.playerName}'s cloud save and leaderboard entry? This cannot be undone.`)) return;
                    runAction(() => adminDeletePlayer(selected.uid), `${selected.playerName}'s account was deleted.`, false);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
