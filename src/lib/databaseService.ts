import {
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  Character,
  Resources,
  SkillNode,
  Achievement,
  EquipmentItem,
  LeaderboardEntry,
} from '../types';

export interface UserSavePayload {
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

// Calculate a fair player score for rankings
export function calculatePlayerScore(
  character: Character,
  resources: Resources,
  stats: { totalHarvests: number; totalDamageDealt: number; itemsCrafted: number },
  achievements: Achievement[]
): number {
  const levelScore = (character.level || 1) * 2000;
  const goldScore = Math.floor((resources.gold || 0) / 100);
  const gemScore = (resources.gems || 0) * 10;
  const harvestScore = (stats.totalHarvests || 0) * 5;
  const combatScore = Math.floor((stats.totalDamageDealt || 0) / 10);
  const achievementScore = achievements.filter((a) => a.unlocked).length * 500;

  return levelScore + goldScore + gemScore + harvestScore + combatScore + achievementScore;
}

// Generate or retrieve persistent local user ID if Firebase Anonymous auth is disabled in project settings
export function getOrCreateLocalUserId(): string {
  let uid = localStorage.getItem('aetheria_user_uid');
  if (!uid) {
    uid = 'hero_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
    localStorage.setItem('aetheria_user_uid', uid);
  }
  return uid;
}

// Generate or retrieve a clean unique 8-character Cloud Sync Code (e.g. AETH-7K92)
export function getOrCreateCloudCode(): string {
  let code = localStorage.getItem('aetheria_cloud_code');
  if (!code) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `AETH-${randomPart}`;
    localStorage.setItem('aetheria_cloud_code', code);
  }
  return code;
}

// Ensure user ID is retrieved either via Firebase Auth or persistent local ID fallback
export async function getUserUid(): Promise<string> {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  try {
    const userCred = await signInAnonymously(auth);
    return userCred.user.uid;
  } catch (err: any) {
    // If anonymous auth is disabled (auth/admin-restricted-operation) or throws any error, return persistent local ID
    console.warn('Firebase Anonymous Auth unavailable, using persistent client user ID fallback:', err?.message || err);
    return getOrCreateLocalUserId();
  }
}

// Admin edits bump `adminRevision` on the user doc. The client remembers the last revision it has
// applied, so a sync never overwrites an admin edit it hasn't loaded yet.
const ADMIN_REVISION_KEY = 'aetheria_admin_revision';

const getLocalAdminRevision = () => Number(localStorage.getItem(ADMIN_REVISION_KEY)) || 0;
const setLocalAdminRevision = (rev: number) => localStorage.setItem(ADMIN_REVISION_KEY, String(rev || 0));

const payloadFromDoc = (d: any): UserSavePayload => ({
  character: d.character,
  resources: d.resources,
  skills: d.skills,
  achievements: d.achievements,
  inventory: d.inventory,
  stats: d.stats || { totalHarvests: 0, totalDamageDealt: 0, itemsCrafted: 0 },
});

// Save complete player data to Firestore Cloud Database with Unique Cloud Code
export async function saveGameToCloud(payload: UserSavePayload): Promise<{
  success: boolean;
  uid: string;
  cloudCode: string;
  error?: string;
  adminUpdatedData?: UserSavePayload;
}> {
  try {
    const uid = await getUserUid();
    const cloudCode = getOrCreateCloudCode();

    const existing = await getDoc(doc(db, 'users', uid));
    const existingData = existing.exists() ? existing.data() : null;
    const remoteRevision = Number(existingData?.adminRevision) || 0;
    if (existingData && remoteRevision > getLocalAdminRevision() && existingData.character && existingData.resources) {
      setLocalAdminRevision(remoteRevision);
      return { success: false, uid, cloudCode, adminUpdatedData: payloadFromDoc(existingData) };
    }

    const scoreAdjustment = Number(existingData?.scoreAdjustment) || 0;
    const score = Math.max(
      0,
      calculatePlayerScore(payload.character, payload.resources, payload.stats, payload.achievements) + scoreAdjustment
    );
    const unlockedAchievements = payload.achievements.filter((a) => a.unlocked).length;

    const combatPower =
      (payload.character.attributes.strength || 10) * 3 +
      (payload.character.attributes.agility || 10) * 2 +
      (payload.character.attributes.intelligence || 10) * 2.5 +
      (payload.character.level || 1) * 10;

    const nowISO = new Date().toISOString();

    // 1. Save user private save file
    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        uid,
        cloudCode,
        syncCode: cloudCode,
        displayName: payload.character.name || 'Hero of Aetheria',
        heroClass: payload.character.heroClass,
        level: payload.character.level,
        gold: payload.resources.gold,
        gems: payload.resources.gems,
        score,
        character: payload.character,
        resources: payload.resources,
        skills: payload.skills,
        achievements: payload.achievements,
        inventory: payload.inventory,
        stats: payload.stats,
        updatedAt: nowISO,
        serverTime: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Update public leaderboard entry
    const leaderboardDocRef = doc(db, 'leaderboard', uid);
    await setDoc(
      leaderboardDocRef,
      {
        id: uid,
        uid,
        cloudCode,
        syncCode: cloudCode,
        playerName: payload.character.name || 'Hero of Aetheria',
        heroClass: payload.character.heroClass,
        level: payload.character.level,
        gold: payload.resources.gold,
        score,
        combatPower,
        totalResourcesHarvested: payload.stats.totalHarvests || 0,
        achievementsUnlocked: unlockedAchievements,
        updatedAt: nowISO,
        serverTime: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, uid, cloudCode };
  } catch (error: any) {
    console.error('Save to Cloud Firestore failed:', error);
    return { success: false, uid: getOrCreateLocalUserId(), cloudCode: getOrCreateCloudCode(), error: error.message || 'Cloud Save Failed' };
  }
}

// Load player data from Firestore Cloud Database for current user
export async function loadGameFromCloud(): Promise<{ success: boolean; data?: UserSavePayload; cloudCode?: string; error?: string }> {
  try {
    const uid = await getUserUid();
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const d = docSnap.data();
      setLocalAdminRevision(Number(d.adminRevision) || 0);
      return {
        success: true,
        cloudCode: d.cloudCode || d.syncCode || getOrCreateCloudCode(),
        data: {
          character: d.character,
          resources: d.resources,
          skills: d.skills,
          achievements: d.achievements,
          inventory: d.inventory,
          stats: d.stats || { totalHarvests: 0, totalDamageDealt: 0, itemsCrafted: 0 },
        },
      };
    } else {
      return { success: false, error: 'No cloud save found for this hero ID.' };
    }
  } catch (error: any) {
    console.error('Load from Cloud Firestore failed:', error);
    return { success: false, error: error.message || 'Load Failed' };
  }
}

// Load ANY player's save data by their Unique Cloud Code (or raw UID)
export async function loadGameByCloudCode(inputCode: string): Promise<{ success: boolean; data?: UserSavePayload; playerName?: string; cloudCode?: string; error?: string }> {
  try {
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a valid Cloud Code.' };
    }

    // 1. First check if cleanCode is a direct document ID (raw UID)
    const directDocRef = doc(db, 'users', inputCode.trim());
    const directSnap = await getDoc(directDocRef);

    if (directSnap.exists()) {
      const d = directSnap.data();
      return {
        success: true,
        playerName: d.displayName || d.character?.name || 'Unknown Hero',
        cloudCode: d.cloudCode || d.syncCode || cleanCode,
        data: {
          character: d.character,
          resources: d.resources,
          skills: d.skills,
          achievements: d.achievements,
          inventory: d.inventory,
          stats: d.stats || { totalHarvests: 0, totalDamageDealt: 0, itemsCrafted: 0 },
        },
      };
    }

    // 2. Query users collection by cloudCode or syncCode
    const usersRef = collection(db, 'users');
    const q1 = query(usersRef, where('cloudCode', '==', cleanCode), limit(1));
    let snap1 = await getDocs(q1);

    if (snap1.empty) {
      const q2 = query(usersRef, where('syncCode', '==', cleanCode), limit(1));
      snap1 = await getDocs(q2);
    }

    if (!snap1.empty) {
      const docSnap = snap1.docs[0];
      const d = docSnap.data();
      return {
        success: true,
        playerName: d.displayName || d.character?.name || 'Unknown Hero',
        cloudCode: d.cloudCode || d.syncCode || cleanCode,
        data: {
          character: d.character,
          resources: d.resources,
          skills: d.skills,
          achievements: d.achievements,
          inventory: d.inventory,
          stats: d.stats || { totalHarvests: 0, totalDamageDealt: 0, itemsCrafted: 0 },
        },
      };
    }

    return { success: false, error: `No cloud save found matching code "${cleanCode}". Check the code and try again!` };
  } catch (error: any) {
    console.error('Error searching cloud code:', error);
    return { success: false, error: error.message || 'Cloud lookup failed.' };
  }
}

// Fetch global leaderboard entries from Firestore
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const currentUid = await getUserUid();
    const currentCode = getOrCreateCloudCode();

    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);

    const entries: LeaderboardEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const entryCode = data.cloudCode || data.syncCode || docSnap.id.substring(0, 8).toUpperCase();
      entries.push({
        id: docSnap.id,
        syncCode: entryCode,
        playerName: data.playerName || 'Hero of Aetheria',
        heroClass: data.heroClass || 'warrior',
        level: Number(data.level) || 1,
        combatPower: Number(data.combatPower) || 10,
        totalResourcesHarvested: Number(data.totalResourcesHarvested) || 0,
        achievementsUnlocked: Number(data.achievementsUnlocked) || 0,
        gold: Number(data.gold) || 0,
        score: Number(data.score) || 0,
        updatedAt: data.updatedAt || new Date().toISOString(),
        isUser: docSnap.id === currentUid || entryCode === currentCode,
      });
    });

    return entries;
  } catch (error) {
    console.error('Error fetching Firestore leaderboard:', error);
    return [];
  }
}


// ---------------------------------------------------------------------------
// Admin: manage other players' accounts and leaderboard entries
// ---------------------------------------------------------------------------

export interface AdminPlayerRecord {
  uid: string;
  cloudCode: string;
  playerName: string;
  heroClass: string;
  level: number;
  gold: number;
  gems: number;
  score: number;
  scoreAdjustment: number;
  updatedAt: string;
  hasSave: boolean;
  onLeaderboard: boolean;
}

// Merge the `users` (save files) and `leaderboard` collections into one list keyed by uid
export async function adminFetchPlayers(): Promise<AdminPlayerRecord[]> {
  const [usersSnap, lbSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), limit(500))),
    getDocs(query(collection(db, 'leaderboard'), limit(500))),
  ]);

  const players = new Map<string, AdminPlayerRecord>();

  lbSnap.forEach((docSnap) => {
    const d = docSnap.data();
    players.set(docSnap.id, {
      uid: docSnap.id,
      cloudCode: d.cloudCode || d.syncCode || '',
      playerName: d.playerName || 'Hero of Aetheria',
      heroClass: d.heroClass || 'warrior',
      level: Number(d.level) || 1,
      gold: Number(d.gold) || 0,
      gems: 0,
      score: Number(d.score) || 0,
      scoreAdjustment: 0,
      updatedAt: d.updatedAt || '',
      hasSave: false,
      onLeaderboard: true,
    });
  });

  usersSnap.forEach((docSnap) => {
    const d = docSnap.data();
    const lb = players.get(docSnap.id);
    players.set(docSnap.id, {
      uid: docSnap.id,
      cloudCode: d.cloudCode || d.syncCode || lb?.cloudCode || '',
      playerName: d.displayName || d.character?.name || lb?.playerName || 'Hero of Aetheria',
      heroClass: d.heroClass || d.character?.heroClass || lb?.heroClass || 'warrior',
      level: Number(d.character?.level ?? d.level) || lb?.level || 1,
      gold: Number(d.resources?.gold ?? d.gold) || 0,
      gems: Number(d.resources?.gems ?? d.gems) || 0,
      score: lb ? lb.score : Number(d.score) || 0,
      scoreAdjustment: Number(d.scoreAdjustment) || 0,
      updatedAt: d.updatedAt || lb?.updatedAt || '',
      hasSave: true,
      onLeaderboard: !!lb,
    });
  });

  return [...players.values()].sort((a, b) => b.score - a.score);
}

export interface AdminPlayerPatch {
  gold?: number;
  gems?: number;
  level?: number;
  playerName?: string;
  score?: number; // new target score; stored as an adjustment so it survives the player's next sync
}

export async function adminUpdatePlayer(player: AdminPlayerRecord, patch: AdminPlayerPatch): Promise<void> {
  const userUpdate: Record<string, unknown> = {};
  const lbUpdate: Record<string, unknown> = {};

  if (patch.gold !== undefined) {
    userUpdate['resources.gold'] = patch.gold;
    userUpdate.gold = patch.gold;
    lbUpdate.gold = patch.gold;
  }
  if (patch.gems !== undefined) {
    userUpdate['resources.gems'] = patch.gems;
    userUpdate.gems = patch.gems;
  }
  if (patch.level !== undefined) {
    userUpdate['character.level'] = patch.level;
    userUpdate['character.xp'] = 0;
    userUpdate['character.xpToNextLevel'] = patch.level * 120 + 60;
    userUpdate.level = patch.level;
    lbUpdate.level = patch.level;
  }
  if (patch.playerName !== undefined) {
    userUpdate['character.name'] = patch.playerName;
    userUpdate.displayName = patch.playerName;
    lbUpdate.playerName = patch.playerName;
  }
  if (patch.score !== undefined) {
    userUpdate.scoreAdjustment = player.scoreAdjustment + (patch.score - player.score);
    userUpdate.score = patch.score;
    lbUpdate.score = patch.score;
  }

  if (player.hasSave && Object.keys(userUpdate).length > 0) {
    await updateDoc(doc(db, 'users', player.uid), {
      ...userUpdate,
      adminRevision: increment(1),
      adminEditedAt: new Date().toISOString(),
    });
  }
  if (player.onLeaderboard && Object.keys(lbUpdate).length > 0) {
    await updateDoc(doc(db, 'leaderboard', player.uid), lbUpdate);
  }
}

export async function adminRemoveFromLeaderboard(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'leaderboard', uid));
}

export async function adminDeletePlayer(uid: string): Promise<void> {
  await Promise.all([deleteDoc(doc(db, 'leaderboard', uid)), deleteDoc(doc(db, 'users', uid))]);
}
