import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  /** uid -> prenom, pour afficher qui est concerne par un evenement. */
  members: Record<string, string>;
  /** uid -> couleur, pour reconnaitre d'un coup d'oeil a qui est un evenement. */
  colors: Record<string, string>;
}

/**
 * Couleurs attribuees aux membres. L'orange de l'application en est absent :
 * il reste reserve a l'accent general et aux evenements de tout le foyer.
 */
export const MEMBER_COLORS = [
  '#0EA5E9', // bleu
  '#8B5CF6', // violet
  '#EC4899', // rose
  '#14B8A6', // turquoise
  '#F59E0B', // ambre
  '#6366F1', // indigo
];

/** Couleur d'un evenement qui concerne tout le foyer. */
export const HOUSEHOLD_COLOR = '#FF7A41';

/** Premiere couleur libre, en repartant du debut si la palette est epuisee. */
function pickColor(used: string[]): string {
  return MEMBER_COLORS.find((c) => !used.includes(c)) ?? MEMBER_COLORS[used.length % MEMBER_COLORS.length];
}

// Alphabet sans caracteres ambigus (ni O/0, ni I/1) : le code se dicte a voix
// haute et se recopie a la main.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function createGroup(uid: string, name: string, displayName: string): Promise<string> {
  const db = getDb();
  const trimmed = name.trim() || 'Mon foyer';

  // L'identifiant du document EST le code de partage : on retente si le tirage
  // tombe sur un code deja pris.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = doc(db, 'groups', code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    await setDoc(ref, {
      name: trimmed,
      createdBy: uid,
      createdAt: serverTimestamp(),
      memberUids: [uid],
      members: { [uid]: displayName },
      colors: { [uid]: MEMBER_COLORS[0] },
    });
    await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
    return code;
  }

  throw new Error("Impossible de générer un code de foyer, réessaie.");
}

export async function joinGroup(uid: string, rawCode: string, displayName: string): Promise<string> {
  const db = getDb();
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) {
    throw new Error(`Un code de foyer contient ${CODE_LENGTH} caractères.`);
  }

  const ref = doc(db, 'groups', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Aucun foyer ne correspond à ce code.');
  }

  const memberUids: string[] = snap.data().memberUids ?? [];
  const colors: Record<string, string> = snap.data().colors ?? {};
  await updateDoc(ref, {
    ...(memberUids.includes(uid) ? {} : { memberUids: arrayUnion(uid) }),
    [`members.${uid}`]: displayName,
    ...(colors[uid] ? {} : { [`colors.${uid}`]: pickColor(Object.values(colors)) }),
  });
  await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
  return code;
}

/**
 * Quitte un foyer : on se retire de la liste des membres et on efface le
 * rattachement sur son profil. Les donnees du foyer restent en place pour
 * les membres qui y restent.
 */
export async function leaveGroup(uid: string, groupId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'groups', groupId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const memberUids: string[] = snap.data().memberUids ?? [];
    if (memberUids.includes(uid)) {
      await updateDoc(ref, { memberUids: arrayRemove(uid) });
    }
  }

  await setDoc(doc(db, 'users', uid), { groupId: null }, { merge: true });
}

export async function fetchGroupInfo(groupId: string): Promise<GroupInfo | null> {
  const snap = await getDoc(doc(getDb(), 'groups', groupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const memberUids: string[] = data.memberUids ?? [];
  const members: Record<string, string> = data.members ?? {};
  const colors: Record<string, string> = data.colors ?? {};

  return {
    id: groupId,
    name: data.name ?? 'Mon foyer',
    memberCount: memberUids.length,
    // Un membre ayant rejoint avant l'ajout des prenoms n'a pas d'entree :
    // on lui en fabrique une plutot que d'afficher un trou.
    members: Object.fromEntries(
      memberUids.map((uid) => [uid, members[uid] ?? 'Membre du foyer']),
    ),
    colors: Object.fromEntries(
      memberUids.map((uid, i) => [uid, colors[uid] ?? MEMBER_COLORS[i % MEMBER_COLORS.length]]),
    ),
  };
}

/**
 * S'assure que le prenom et la couleur de l'utilisateur figurent bien dans le
 * foyer. Necessaire pour les foyers crees avant ces ajouts, et pour repercuter
 * un changement de prenom.
 */
export async function ensureMemberProfile(
  groupId: string,
  uid: string,
  displayName: string,
): Promise<boolean> {
  const ref = doc(getDb(), 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const data = snap.data();
  const currentName = (data.members ?? {})[uid];
  const colors: Record<string, string> = data.colors ?? {};

  const patch: Record<string, string> = {};
  if (currentName !== displayName) patch[`members.${uid}`] = displayName;
  if (!colors[uid]) {
    // On ne compte que les couleurs des autres, sinon on se bloquerait
    // soi-meme une teinte deja prise.
    const used = Object.entries(colors).filter(([k]) => k !== uid).map(([, v]) => v);
    patch[`colors.${uid}`] = pickColor(used);
  }

  if (Object.keys(patch).length === 0) return false;
  await updateDoc(ref, patch);
  return true;
}

export async function fetchUserGroupId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid));
  return snap.exists() ? (snap.data().groupId ?? null) : null;
}
