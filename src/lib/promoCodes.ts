import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  orderBy,
  query,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { getUserUid } from './databaseService';
import { ForgeQuality } from '../types';

export interface PromoItemReward {
  recipeId: string; // EQUIPMENT_CATALOG id
  quality: ForgeQuality;
}

export interface PromoRewards {
  gold: number;
  gems: number;
  items: PromoItemReward[];
}

export interface PromoCode extends PromoRewards {
  code: string;
  maxActivations: number;
  activations: number;
  active: boolean;
  createdAt: string;
}

// Limits keep a single code from breaking the economy (same caps the client applies on load)
export const PROMO_MAX_GOLD = 50000000;
export const PROMO_MAX_GEMS = 50000;
export const PROMO_MAX_ITEMS = 5;
// redeemedBy holds one uid per activation; this keeps the doc well under the 1 MB Firestore limit
export const PROMO_MAX_ACTIVATIONS = 10000;

const LOCAL_REDEEMED_KEY = 'aetheria_redeemed_codes';

// Codes are case-insensitive: "adminabuse" and "ADMINABUSE" are the same code
export const normalizePromoCode = (raw: string) => raw.trim().toUpperCase();

// Firestore denies the promoCodes collection until the rules in firestore.rules are deployed
export function promoErrorMessage(err: any, fallback: string): string {
  if (err?.code === 'permission-denied') {
    return 'Promo codes are not enabled on the server yet (Firestore rules for promoCodes are not deployed).';
  }
  return err?.message || fallback;
}

export const isValidPromoCode = (code: string) => /^[A-Z0-9_-]{3,24}$/.test(code);

const promoRef = (code: string) => doc(db, 'promoCodes', code);

export function getLocallyRedeemedCodes(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_REDEEMED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rememberRedeemed(code: string) {
  try {
    const list = getLocallyRedeemedCodes().filter((c) => c !== code);
    localStorage.setItem(LOCAL_REDEEMED_KEY, JSON.stringify([code, ...list].slice(0, 50)));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminFetchPromoCodes(): Promise<PromoCode[]> {
  const snap = await getDocsFromServer(query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      code: d.id,
      gold: Number(data.gold) || 0,
      gems: Number(data.gems) || 0,
      items: Array.isArray(data.items) ? data.items : [],
      maxActivations: Number(data.maxActivations) || 0,
      activations: Number(data.activations) || 0,
      active: data.active !== false,
      createdAt: data.createdAt || '',
    };
  });
}

export async function adminCreatePromoCode(
  rawCode: string,
  rewards: PromoRewards,
  maxActivations: number
): Promise<void> {
  const code = normalizePromoCode(rawCode);
  if (!isValidPromoCode(code)) {
    throw new Error('Code must be 3–24 characters: letters, digits, "_" or "-".');
  }
  if (rewards.gold <= 0 && rewards.gems <= 0 && rewards.items.length === 0) {
    throw new Error('Add at least one reward.');
  }

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(promoRef(code));
    if (existing.exists()) {
      throw new Error(`Code "${code}" already exists.`);
    }
    tx.set(promoRef(code), {
      code,
      gold: Math.min(PROMO_MAX_GOLD, Math.max(0, Math.floor(rewards.gold))),
      gems: Math.min(PROMO_MAX_GEMS, Math.max(0, Math.floor(rewards.gems))),
      items: rewards.items.slice(0, PROMO_MAX_ITEMS),
      maxActivations: Math.min(PROMO_MAX_ACTIVATIONS, Math.max(1, Math.floor(maxActivations))),
      activations: 0,
      redeemedBy: [],
      active: true,
      createdAt: new Date().toISOString(),
    });
  });
}

export async function adminSetPromoActive(code: string, active: boolean): Promise<void> {
  await updateDoc(promoRef(code), { active });
}

export async function adminDeletePromoCode(code: string): Promise<void> {
  await deleteDoc(promoRef(code));
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

// Claims one activation atomically: the limit and the one-per-player rule are checked inside the transaction
export async function redeemPromoCode(rawCode: string): Promise<PromoRewards> {
  const code = normalizePromoCode(rawCode);
  if (!isValidPromoCode(code)) {
    throw new Error('Invalid code.');
  }
  if (getLocallyRedeemedCodes().includes(code)) {
    throw new Error('You have already redeemed this code.');
  }

  const uid = await getUserUid();

  const rewards = await runTransaction(db, async (tx) => {
    const snap = await tx.get(promoRef(code));
    if (!snap.exists()) {
      throw new Error('This code does not exist.');
    }
    const data = snap.data();
    const activations = Number(data.activations) || 0;
    const maxActivations = Number(data.maxActivations) || 0;
    const redeemedBy: string[] = Array.isArray(data.redeemedBy) ? data.redeemedBy : [];

    if (data.active === false) throw new Error('This code has been disabled.');
    if (redeemedBy.includes(uid)) throw new Error('You have already redeemed this code.');
    if (activations >= maxActivations) throw new Error('This code has reached its activation limit.');

    tx.update(promoRef(code), { activations: activations + 1, redeemedBy: arrayUnion(uid) });

    return {
      gold: Number(data.gold) || 0,
      gems: Number(data.gems) || 0,
      items: Array.isArray(data.items) ? data.items : [],
    } as PromoRewards;
  });

  rememberRedeemed(code);
  return rewards;
}
