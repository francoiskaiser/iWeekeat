import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Recipe, RecipeCategory, RecipeIngredient, RecipeStats } from '@/types';
import { getDb } from './firebase';

/*
 * Recettes de la communaute, notes et moderation.
 *
 * Modele Firestore (voir firestore.rules) :
 *   recipes/{id}                       recette publiee par un utilisateur
 *   recipes/{id}/reports/{uid}         un signalement par personne
 *   recipeStats/{recipeId}             { count, sum } : notes cumulees,
 *                                      pour les recettes par defaut comme
 *                                      pour celles de la communaute
 *   recipeStats/{recipeId}/ratings/{uid}  { stars } : la note de chacun
 *   users/{uid}                        + blockedUids, communityRulesAcceptedAt
 *
 * Les compteurs de notes sont tenus par l'application elle-meme (pas de
 * serveur) : les regles de securite verifient a chaque ecriture que la note
 * et le compteur bougent ensemble, ce qui empeche de voter deux fois ou de
 * gonfler un score.
 */

/** Nombre de signalements a partir duquel une recette est masquee. */
export const REPORT_THRESHOLD = 3;

/** Nombre maximal de recettes de la communaute chargees. */
const COMMUNITY_LIMIT = 500;

export type RecipeDraft = Pick<Recipe, 'title' | 'category' | 'servings' | 'minutes' | 'ingredients' | 'steps'>;

// Firestore refuse les champs `undefined` : on ne garde la quantite que si elle existe.
function cleanIngredients(list: RecipeIngredient[]): RecipeIngredient[] {
  return list
    .map((i) => ({ name: i.name.trim(), quantity: i.quantity?.trim() }))
    .filter((i) => i.name)
    .map((i) => (i.quantity ? { name: i.name, quantity: i.quantity } : { name: i.name }));
}

function cleanDraft(draft: RecipeDraft): RecipeDraft {
  return {
    title: draft.title.trim(),
    category: draft.category,
    servings: Math.round(draft.servings),
    minutes: Math.round(draft.minutes),
    ingredients: cleanIngredients(draft.ingredients),
    steps: draft.steps.map((s) => s.trim()).filter(Boolean),
  };
}

function fromDoc(id: string, raw: Record<string, unknown>): Recipe {
  const created = raw.createdAt as Timestamp | null | undefined;
  return {
    id,
    title: String(raw.title ?? ''),
    category: raw.category as RecipeCategory,
    servings: Number(raw.servings ?? 4),
    minutes: Number(raw.minutes ?? 30),
    ingredients: (raw.ingredients ?? []) as RecipeIngredient[],
    steps: (raw.steps ?? []) as string[],
    source: 'community',
    authorUid: raw.authorUid as string | undefined,
    authorName: raw.authorName as string | undefined,
    // Juste apres la publication, l'horodatage serveur n'est pas encore connu.
    createdAt: created?.toMillis?.() ?? Date.now(),
    hidden: Boolean(raw.hidden),
  };
}

/** Recettes visibles de la communaute, plus celles de l'utilisateur (meme masquees). */
export async function fetchCommunityRecipes(uid: string): Promise<Recipe[]> {
  const db = getDb();
  const col = collection(db, 'recipes');

  // Pas de orderBy cote serveur : combine au filtre, il exigerait un index
  // composite a creer a la main. On trie dans l'application.
  const [visible, mine] = await Promise.all([
    getDocs(query(col, where('hidden', '==', false), limit(COMMUNITY_LIMIT))),
    getDocs(query(col, where('authorUid', '==', uid))),
  ]);

  const byId = new Map<string, Recipe>();
  for (const snap of [...visible.docs, ...mine.docs]) {
    byId.set(snap.id, fromDoc(snap.id, snap.data()));
  }
  return Array.from(byId.values());
}

/** Notes cumulees de toutes les recettes, indexees par identifiant. */
export async function fetchAllStats(): Promise<Record<string, RecipeStats>> {
  const snaps = await getDocs(collection(getDb(), 'recipeStats'));
  const out: Record<string, RecipeStats> = {};
  for (const snap of snaps.docs) {
    const d = snap.data();
    out[snap.id] = { count: Number(d.count ?? 0), sum: Number(d.sum ?? 0) };
  }
  return out;
}

/** Note donnee par l'utilisateur a une recette, ou null. */
export async function fetchMyRating(recipeId: string, uid: string): Promise<number | null> {
  const snap = await getDoc(doc(getDb(), 'recipeStats', recipeId, 'ratings', uid));
  return snap.exists() ? Number(snap.data().stars) : null;
}

/**
 * Enregistre (ou modifie) la note de l'utilisateur.
 * En transaction : si quelqu'un vote au meme instant, Firestore rejoue le
 * calcul avec le compteur a jour au lieu d'ecraser son vote.
 */
export async function rateRecipe(recipeId: string, uid: string, stars: number): Promise<RecipeStats> {
  const value = Math.min(5, Math.max(1, Math.round(stars)));
  const db = getDb();
  const statsRef = doc(db, 'recipeStats', recipeId);
  const ratingRef = doc(db, 'recipeStats', recipeId, 'ratings', uid);

  return runTransaction(db, async (tx) => {
    const [statsSnap, ratingSnap] = await Promise.all([tx.get(statsRef), tx.get(ratingRef)]);
    const current: RecipeStats = statsSnap.exists()
      ? { count: Number(statsSnap.data().count ?? 0), sum: Number(statsSnap.data().sum ?? 0) }
      : { count: 0, sum: 0 };
    const previous = ratingSnap.exists() ? Number(ratingSnap.data().stars) : null;

    const next: RecipeStats = previous === null
      ? { count: current.count + 1, sum: current.sum + value }
      : { count: current.count, sum: current.sum - previous + value };

    tx.set(statsRef, next);
    tx.set(ratingRef, { stars: value });
    return next;
  });
}

export async function publishRecipe(uid: string, authorName: string, draft: RecipeDraft): Promise<Recipe> {
  const db = getDb();
  const ref = doc(collection(db, 'recipes'));
  const clean = cleanDraft(draft);
  await setDoc(ref, {
    ...clean,
    authorUid: uid,
    authorName: authorName.trim().slice(0, 40) || 'Chef',
    createdAt: serverTimestamp(),
    hidden: false,
    reportCount: 0,
  });
  return { ...clean, id: ref.id, source: 'community', authorUid: uid, authorName, createdAt: Date.now(), hidden: false };
}

export async function updateRecipe(recipeId: string, draft: RecipeDraft): Promise<void> {
  await updateDoc(doc(getDb(), 'recipes', recipeId), { ...cleanDraft(draft) });
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'recipes', recipeId));
}

/**
 * Signale une recette. Un seul signalement par personne ; au-dela du seuil,
 * la recette disparait du catalogue en attendant une verification.
 * Renvoie false si l'utilisateur l'avait deja signalee.
 */
export async function reportRecipe(recipeId: string, uid: string, reason: string): Promise<boolean> {
  const db = getDb();
  const recipeRef = doc(db, 'recipes', recipeId);
  const reportRef = doc(db, 'recipes', recipeId, 'reports', uid);

  return runTransaction(db, async (tx) => {
    const recipeSnap = await tx.get(recipeRef);
    if (!recipeSnap.exists()) return false;

    // La lecture d'un signalement est interdite (meme le sien) : on s'appuie
    // sur le refus de l'ecriture en double plutot que sur une lecture.
    const count = Number(recipeSnap.data().reportCount ?? 0) + 1;
    tx.set(reportRef, { reason: reason.trim().slice(0, 200), at: serverTimestamp() });
    tx.update(recipeRef, {
      reportCount: count,
      hidden: Boolean(recipeSnap.data().hidden) || count >= REPORT_THRESHOLD,
    });
    return true;
  }).catch((error: { code?: string }) => {
    // Deja signalee par cette personne : les regles refusent la seconde fois.
    if (error?.code === 'permission-denied') return false;
    throw error;
  });
}

export interface CommunityProfile {
  blockedUids: string[];
  rulesAccepted: boolean;
}

export async function fetchCommunityProfile(uid: string): Promise<CommunityProfile> {
  const snap = await getDoc(doc(getDb(), 'users', uid));
  const d = snap.exists() ? snap.data() : {};
  return {
    blockedUids: (d.blockedUids ?? []) as string[],
    rulesAccepted: Boolean(d.communityRulesAcceptedAt),
  };
}

export async function acceptCommunityRules(uid: string): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), { communityRulesAcceptedAt: serverTimestamp() }, { merge: true });
}

export async function blockAuthor(uid: string, authorUid: string): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), { blockedUids: arrayUnion(authorUid) }, { merge: true });
}

export async function unblockAuthor(uid: string, authorUid: string): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), { blockedUids: arrayRemove(authorUid) }, { merge: true });
}

// --- Cache hors ligne -------------------------------------------------------
// Le catalogue doit rester consultable au supermarche, sans reseau.

// Par utilisateur : les auteurs bloques et l'acceptation de la charte sont
// personnels, ils ne doivent pas passer d'un compte a l'autre sur un meme telephone.
const cacheKey = (uid: string) => `@iweekeat_community_cache_${uid}`;

interface CommunityCache {
  recipes: Recipe[];
  stats: Record<string, RecipeStats>;
  profile: CommunityProfile;
}

export async function loadCommunityCache(uid: string): Promise<CommunityCache | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as CommunityCache) : null;
  } catch {
    return null;
  }
}

export async function saveCommunityCache(uid: string, cache: CommunityCache): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(cache));
  } catch {
    // Cache facultatif : on rechargera depuis le reseau.
  }
}

// --- Classement ---------------------------------------------------------------

/**
 * Moyenne bayesienne : chaque recette part comme si elle avait deja recu
 * quelques notes moyennes. Une seule note de 5 ne suffit donc pas a passer
 * devant une recette notee 4,8 par cinquante personnes.
 */
const PRIOR_MEAN = 3.5;
const PRIOR_WEIGHT = 3;

export function rankingScore(stats?: RecipeStats): number {
  const count = stats?.count ?? 0;
  const sum = stats?.sum ?? 0;
  return (sum + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT);
}

export function averageStars(stats?: RecipeStats): number | null {
  if (!stats || stats.count === 0) return null;
  return stats.sum / stats.count;
}
