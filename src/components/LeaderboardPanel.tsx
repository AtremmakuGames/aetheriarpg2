import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, Character, Resources, Achievement, SkillNode, EquipmentItem } from '../types';
import { fetchLeaderboard, saveGameToCloud, loadGameFromCloud, loadGameByCloudCode, getOrCreateCloudCode, UserSavePayload } from '../lib/databaseService';
import { sound } from '../audio';
import {
  Trophy,
  Crown,
  Medal,
  Swords,
  Pickaxe,
  Coins,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Search,
  Sparkles,
  Shield,
  User,
  CheckCircle2,
  AlertCircle,
  Database,
  Flame,
  Award,
  Copy,
  Check,
  KeyRound,
  Download,
} from 'lucide-react';

interface LeaderboardPanelProps {
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
  onLoadCloudSave?: (data: UserSavePayload) => void;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  character,
  resources,
  skills,
  achievements,
  inventory,
  stats,
  onLoadCloudSave,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'level' | 'gold' | 'combatPower' | 'totalResourcesHarvested'>('score');

  // Cloud Code States
  const [userCloudCode, setUserCloudCode] = useState<string>(() => getOrCreateCloudCode());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [importCodeInput, setImportCodeInput] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLeaderboard();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCloudCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(userCloudCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSyncToDatabase = async () => {
    sound.playClick();
    setSyncing(true);
    setSyncMessage(null);

    const result = await saveGameToCloud({
      character,
      resources,
      skills,
      achievements,
      inventory,
      stats,
    });

    setSyncing(false);

    if (result.success) {
      sound.playLevelUp();
      if (result.cloudCode) setUserCloudCode(result.cloudCode);
      setSyncMessage({ type: 'success', text: `Progress synced! Your Unique Cloud Code is ${result.cloudCode}` });
      loadData();
    } else {
      setSyncMessage({ type: 'error', text: result.error || 'Failed to sync save file to Cloud Database.' });
    }
  };

  const handleRestoreCloudSave = async () => {
    if (!window.confirm('Restore your cloud save? This will replace your local progress with the latest data stored in the Cloud Database.')) {
      return;
    }

    sound.playClick();
    setSyncing(true);
    setSyncMessage(null);

    const result = await loadGameFromCloud();
    setSyncing(false);

    if (result.success && result.data) {
      sound.playLevelUp();
      if (result.cloudCode) setUserCloudCode(result.cloudCode);
      if (onLoadCloudSave) {
        onLoadCloudSave(result.data);
      }
      setSyncMessage({ type: 'success', text: 'Cloud save data restored successfully!' });
    } else {
      setSyncMessage({ type: 'error', text: result.error || 'No cloud save found.' });
    }
  };

  const handleImportByCloudCode = async () => {
    if (!importCodeInput.trim()) {
      setSyncMessage({ type: 'error', text: 'Please enter a Cloud Code.' });
      return;
    }

    if (!window.confirm(`Import cloud save for code "${importCodeInput.trim().toUpperCase()}"? This will replace your active character data.`)) {
      return;
    }

    sound.playClick();
    setImporting(true);
    setSyncMessage(null);

    const result = await loadGameByCloudCode(importCodeInput);
    setImporting(false);

    if (result.success && result.data) {
      sound.playLevelUp();
      if (onLoadCloudSave) {
        onLoadCloudSave(result.data);
      }
      setSyncMessage({
        type: 'success',
        text: `Successfully imported save for "${result.playerName}" (${result.cloudCode})!`,
      });
      setImportCodeInput('');
    } else {
      setSyncMessage({ type: 'error', text: result.error || 'Cloud code not found.' });
    }
  };

  // Sort and filter entries
  const sortedEntries = [...entries].sort((a, b) => {
    const valA = Number(a[sortBy] || 0);
    const valB = Number(b[sortBy] || 0);
    return valB - valA;
  });

  const filteredEntries = sortedEntries.filter(
    (e) =>
      e.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.heroClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.syncCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserEntryIndex = sortedEntries.findIndex((e) => e.isUser);
  const currentUserRank = currentUserEntryIndex !== -1 ? currentUserEntryIndex + 1 : null;

  const getClassBadgeColor = (heroClass: string) => {
    switch (heroClass.toLowerCase()) {
      case 'warrior':
        return 'border-rose-500/50 bg-rose-950/40 text-rose-300';
      case 'mage':
        return 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300';
      case 'ranger':
        return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300';
      case 'alchemist':
        return 'border-amber-500/50 bg-amber-950/40 text-amber-300';
      default:
        return 'border-slate-700 bg-slate-900 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-7 h-7 text-amber-400 animate-pulse" />
              <h1 className="text-2xl font-black tracking-tight text-white">Global Database Leaderboard</h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Database className="w-3 h-3" /> Firestore Live
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Compete against other heroes in Aetheria! Sync your character to the cloud database to lock in your high score, or use Unique Cloud Codes to share and load save states across devices.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncToDatabase}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <CloudUpload className="w-4 h-4 text-slate-950" />
              )}
              <span>{syncing ? 'Syncing...' : 'Sync & Rank Up'}</span>
            </button>

            {onLoadCloudSave && (
              <button
                onClick={handleRestoreCloudSave}
                disabled={syncing}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4 text-cyan-400" />
                <span>Restore Mine</span>
              </button>
            )}

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sync Status Feedback Toast */}
        {syncMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
              syncMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}
          >
            {syncMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncMessage.text}</span>
          </div>
        )}
      </div>

      {/* Unique Cloud Code & Hero Status Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: User Quick Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shrink-0">
              {currentUserRank ? `#${currentUserRank}` : '?'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-base">{character.name}</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md border bg-slate-950 text-amber-400 border-amber-500/30">
                  Lvl {character.level} {character.heroClass}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-xs font-medium">Your Cloud Sync Code:</span>
                <button
                  onClick={handleCopyCloudCode}
                  className="bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1 hover:border-amber-400 transition-all group"
                  title="Click to copy unique Cloud Code"
                >
                  <span>{userCloudCode}</span>
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Import Player Save via Cloud Code */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto text-slate-400 text-xs font-bold shrink-0">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Load Cloud Code:</span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={importCodeInput}
                onChange={(e) => setImportCodeInput(e.target.value)}
                placeholder="e.g. AETH-7K92"
                className="w-full uppercase font-mono bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleImportByCloudCode}
                disabled={importing || !importCodeInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 transition-all active:scale-95 disabled:opacity-50"
              >
                {importing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Load</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs flex-wrap gap-2">
          <p className="text-slate-400 text-xs">
            {currentUserRank
              ? `Ranked #${currentUserRank} globally on Firestore Database`
              : 'Not ranked yet — click "Sync & Rank Up" above to submit your score!'}
          </p>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Gold</span>
              <span className="text-amber-400 font-black text-sm flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {resources.gold.toLocaleString()}
              </span>
            </div>

            <div className="text-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Harvests</span>
              <span className="text-emerald-400 font-black text-sm flex items-center justify-center gap-1">
                <Pickaxe className="w-3.5 h-3.5" />
                {stats.totalHarvests.toLocaleString()}
              </span>
            </div>

            <div className="text-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cloud Sync</span>
              <span className="text-cyan-400 font-black text-sm flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Podium Top 3 Cards */}
      {!loading && sortedEntries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 (Silver) */}
          {sortedEntries[1] && (
            <div className="bg-slate-900/90 border border-slate-400/30 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between h-full order-2 md:order-1 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Medal className="w-4 h-4 text-slate-300" /> Rank 2
                </span>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {sortedEntries[1].syncCode}
                </span>
              </div>

              <div className="my-3 space-y-1 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center text-slate-200 font-black text-xl shadow-lg">
                  🥈
                </div>
                <h3 className="font-black text-white text-base truncate">{sortedEntries[1].playerName}</h3>
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getClassBadgeColor(sortedEntries[1].heroClass)}`}>
                  Lvl {sortedEntries[1].level} {sortedEntries[1].heroClass}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl flex items-center justify-around text-xs border border-slate-800">
                <div className="text-center">
                  <span className="text-slate-500 text-[10px] font-bold block">SCORE</span>
                  <span className="font-extrabold text-slate-200">{sortedEntries[1].score?.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-[10px] font-bold block">GOLD</span>
                  <span className="font-extrabold text-amber-400">{sortedEntries[1].gold?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold) */}
          {sortedEntries[0] && (
            <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-amber-400 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-full order-1 md:order-2 shadow-2xl shadow-amber-500/10 hover:border-amber-300 transition-all transform md:-translate-y-2">
              <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
                <Crown className="w-24 h-24 text-amber-400" />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-lg flex items-center gap-1 shadow-md">
                  <Crown className="w-4 h-4 fill-slate-950" /> GRAND CHAMPION
                </span>
                <span className="text-[11px] font-bold text-amber-300 font-mono">
                  {sortedEntries[0].syncCode}
                </span>
              </div>

              <div className="my-4 space-y-1 text-center relative z-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-200 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/30">
                  🥇
                </div>
                <h3 className="font-black text-white text-lg truncate">{sortedEntries[0].playerName}</h3>
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${getClassBadgeColor(sortedEntries[0].heroClass)}`}>
                  Lvl {sortedEntries[0].level} {sortedEntries[0].heroClass}
                </span>
              </div>

              <div className="bg-slate-950/90 p-3 rounded-xl flex items-center justify-around text-xs border border-amber-500/30 relative z-10">
                <div className="text-center">
                  <span className="text-amber-400/80 text-[10px] font-bold block uppercase">SCORE</span>
                  <span className="font-black text-white text-sm">{sortedEntries[0].score?.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-amber-400/80 text-[10px] font-bold block uppercase">GOLD</span>
                  <span className="font-black text-amber-400 text-sm">{sortedEntries[0].gold?.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-amber-400/80 text-[10px] font-bold block uppercase">HARVESTS</span>
                  <span className="font-black text-emerald-400 text-sm">{sortedEntries[0].totalResourcesHarvested?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {sortedEntries[2] && (
            <div className="bg-slate-900/90 border border-amber-700/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between h-full order-3 hover:border-amber-600/60 transition-all">
              <div className="flex items-center justify-between">
                <span className="bg-amber-800/30 text-amber-300 border border-amber-700/50 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-500" /> Rank 3
                </span>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {sortedEntries[2].syncCode}
                </span>
              </div>

              <div className="my-3 space-y-1 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-900/30 border-2 border-amber-600 flex items-center justify-center text-amber-400 font-black text-xl shadow-lg">
                  🥉
                </div>
                <h3 className="font-black text-white text-base truncate">{sortedEntries[2].playerName}</h3>
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getClassBadgeColor(sortedEntries[2].heroClass)}`}>
                  Lvl {sortedEntries[2].level} {sortedEntries[2].heroClass}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl flex items-center justify-around text-xs border border-slate-800">
                <div className="text-center">
                  <span className="text-slate-500 text-[10px] font-bold block">SCORE</span>
                  <span className="font-extrabold text-slate-200">{sortedEntries[2].score?.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-[10px] font-bold block">GOLD</span>
                  <span className="font-extrabold text-amber-400">{sortedEntries[2].gold?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls & Search Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hero or class..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Sort Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider shrink-0 mr-1 hidden lg:inline">
            Sort:
          </span>

          {[
            { id: 'score', label: 'Top Score', icon: Trophy },
            { id: 'level', label: 'Hero Level', icon: Shield },
            { id: 'gold', label: 'Gold Hoard', icon: Coins },
            { id: 'combatPower', label: 'Combat Power', icon: Swords },
            { id: 'totalResourcesHarvested', label: 'Harvests', icon: Pickaxe },
          ].map(({ id, label, icon: IconComp }) => (
            <button
              key={id}
              onClick={() => {
                sound.playClick();
                setSortBy(id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                sortBy === id
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <p className="text-xs font-bold">Querying Firestore Database Rankings...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Database className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-extrabold text-white">No Leaderboard Entries Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Be the first hero to submit your rank! Click the "Sync & Rank Up" button at the top to save your progress to the database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Hero Player</th>
                  <th className="py-3 px-4">Class & Level</th>
                  <th className="py-3 px-4 text-right">Combat Power</th>
                  <th className="py-3 px-4 text-right">Gold</th>
                  <th className="py-3 px-4 text-right">Total Score</th>
                  <th className="py-3 px-4 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredEntries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isUser = entry.isUser;

                  return (
                    <tr
                      key={entry.id || idx}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 text-white font-bold'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      {/* Rank Number / Icon */}
                      <td className="py-3 px-4 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-md">
                            🥇
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-300 text-slate-950 font-black text-xs shadow-md">
                            🥈
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700 text-white font-black text-xs shadow-md">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400 font-extrabold text-xs">#{rank}</span>
                        )}
                      </td>

                      {/* Hero Player Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{entry.playerName}</span>
                          {isUser && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hero Class & Level */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getClassBadgeColor(entry.heroClass)}`}>
                          <span>Lvl {entry.level}</span>
                          <span>{entry.heroClass}</span>
                        </span>
                      </td>

                      {/* Combat Power */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-300">
                        {entry.combatPower ? entry.combatPower.toLocaleString() : '10'}
                      </td>

                      {/* Gold */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        {entry.gold ? entry.gold.toLocaleString() : '0'}
                      </td>

                      {/* Total Score */}
                      <td className="py-3 px-4 text-right font-mono font-black text-white text-sm">
                        {entry.score ? entry.score.toLocaleString() : '0'}
                      </td>

                      {/* Last Active Timestamp */}
                      <td className="py-3 px-4 text-right text-[10px] text-slate-400 font-mono">
                        {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : 'Recently'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
