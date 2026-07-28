import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface CloudDataStore {
  [syncCode: string]: {
    syncCode: string;
    updatedAt: string;
    character: any;
    resources: any;
    skills: any;
    achievements: any;
    inventory: any;
    stats: any;
  };
}

interface LeaderboardRecord {
  id: string;
  syncCode: string;
  playerName: string;
  heroClass: string;
  level: number;
  combatPower: number;
  totalResourcesHarvested: number;
  achievementsUnlocked: number;
  updatedAt: string;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory data structures with local persistence backup
const cloudSaves: CloudDataStore = {};
let leaderboardStore: LeaderboardRecord[] = [
  {
    id: 'lb_bot_1',
    syncCode: 'BOT-9901',
    playerName: 'Valerius Thunder',
    heroClass: 'warrior',
    level: 42,
    combatPower: 8450,
    totalResourcesHarvested: 14200,
    achievementsUnlocked: 6,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'lb_bot_2',
    syncCode: 'BOT-8820',
    playerName: 'Archmage Elena',
    heroClass: 'mage',
    level: 38,
    combatPower: 7920,
    totalResourcesHarvested: 11800,
    achievementsUnlocked: 5,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'lb_bot_3',
    syncCode: 'BOT-7712',
    playerName: 'Sylvan Ranger',
    heroClass: 'ranger',
    level: 31,
    combatPower: 6100,
    totalResourcesHarvested: 8900,
    achievementsUnlocked: 4,
    updatedAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'lb_bot_4',
    syncCode: 'BOT-6604',
    playerName: 'Alchemist Nicolas',
    heroClass: 'alchemist',
    level: 25,
    combatPower: 4800,
    totalResourcesHarvested: 6400,
    achievementsUnlocked: 3,
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'lb_bot_5',
    syncCode: 'BOT-5501',
    playerName: 'Novice iPad Explorer',
    heroClass: 'warrior',
    level: 12,
    combatPower: 1950,
    totalResourcesHarvested: 2100,
    achievementsUnlocked: 2,
    updatedAt: new Date(Date.now() - 18000000).toISOString(),
  },
];

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// GET Leaderboard
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const sorted = [...leaderboardStore].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.combatPower - a.combatPower;
  });

  const ranked = sorted.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  res.json({ success: true, leaderboard: ranked, totalPlayers: ranked.length });
});

// POST Leaderboard Entry
app.post('/api/leaderboard', (req: Request, res: Response) => {
  const { syncCode, playerName, heroClass, level, combatPower, totalResourcesHarvested, achievementsUnlocked } = req.body;

  if (!syncCode || !playerName) {
    res.status(400).json({ error: 'Missing syncCode or playerName' });
    return;
  }

  const existingIdx = leaderboardStore.findIndex((item) => item.syncCode === syncCode);
  const entryData: LeaderboardRecord = {
    id: existingIdx >= 0 ? leaderboardStore[existingIdx].id : `lb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    syncCode,
    playerName,
    heroClass: heroClass || 'warrior',
    level: level || 1,
    combatPower: combatPower || 10,
    totalResourcesHarvested: totalResourcesHarvested || 0,
    achievementsUnlocked: achievementsUnlocked || 0,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    leaderboardStore[existingIdx] = entryData;
  } else {
    leaderboardStore.push(entryData);
  }

  // Find user's new rank
  const sorted = [...leaderboardStore].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.combatPower - a.combatPower;
  });
  const userRank = sorted.findIndex((item) => item.syncCode === syncCode) + 1;

  res.json({ success: true, rank: userRank, entry: entryData });
});

// POST Cloud Save
app.post('/api/cloud-save', (req: Request, res: Response) => {
  const { syncCode, character, resources, skills, achievements, inventory, stats } = req.body;

  if (!syncCode) {
    res.status(400).json({ error: 'syncCode is required for cloud save' });
    return;
  }

  const saveData = {
    syncCode,
    updatedAt: new Date().toISOString(),
    character,
    resources,
    skills,
    achievements,
    inventory,
    stats,
  };

  cloudSaves[syncCode] = saveData;

  // Also update leaderboard automatically if character exists
  if (character) {
    const totalHarvested = stats?.totalHarvests || 0;
    const unlockedAchievements = achievements ? achievements.filter((a: any) => a.unlocked).length : 0;
    const combatPower = (character.level || 1) * 100 + (character.attributes?.strength || 10) * 10 + (character.attributes?.intelligence || 10) * 10;

    const existingIdx = leaderboardStore.findIndex((item) => item.syncCode === syncCode);
    const lbEntry: LeaderboardRecord = {
      id: existingIdx >= 0 ? leaderboardStore[existingIdx].id : `lb_${Date.now()}`,
      syncCode,
      playerName: character.name || 'Hero',
      heroClass: character.heroClass || 'warrior',
      level: character.level || 1,
      combatPower,
      totalResourcesHarvested: totalHarvested,
      achievementsUnlocked: unlockedAchievements,
      updatedAt: saveData.updatedAt,
    };

    if (existingIdx >= 0) {
      leaderboardStore[existingIdx] = lbEntry;
    } else {
      leaderboardStore.push(lbEntry);
    }
  }

  res.json({
    success: true,
    message: 'Progress successfully saved to Cloud',
    updatedAt: saveData.updatedAt,
    syncCode,
  });
});

// POST Cloud Load
app.post('/api/cloud-load', (req: Request, res: Response) => {
  const { syncCode } = req.body;

  if (!syncCode) {
    res.status(400).json({ error: 'syncCode is required' });
    return;
  }

  const saveData = cloudSaves[syncCode];

  if (!saveData) {
    res.status(444).json({ error: `No cloud save data found for code: ${syncCode}` });
    return;
  }

  res.json({
    success: true,
    data: saveData,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Aetheria iPad RPG Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
