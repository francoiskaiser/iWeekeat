import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  /** uid -> prenom, pour afficher qui est concerne par un evenement. */
  members: Record<string, string>;
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
    });
    await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
    return code;
  }

  throw new Error("Impossible de generer un code de foyer, reessayez.");
}

export async function joinGroup(uid: string, rawCode: string, displayName: string): Promise<string> {
  const db = getDb();
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) {
    throw new Error(`Un code de foyer contient ${CODE_LENGTH} caracteres.`);
  }

  const ref = doc(db, 'groups', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Aucun foyer ne correspond a ce code.');
  }

  const memberUids: string[] = snap.data().memberUids ?? [];
  await updateDoc(ref, {
    ...(memberUids.includes(uid) ? {} : { memberUids: arrayUnion(uid) }),
    [`members.${uid}`]: displayName,
  });
  await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
  return code;
}

export async function fetchGroupInfo(groupId: string): Promise<GroupInfo | null> {
  const snap = await getDoc(doc(getDb(), 'groups', groupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const memberUids: string[] = data.memberUids ?? [];
  const members: Record<string, string> = data.members ?? {};

  return {
    id: groupId,
    name: data.name ?? 'Mon foyer',
    memberCount: memberUids.length,
    // Un membre ayant rejoint avant l'ajout des prenoms n'a pas d'entree :
    // on lui en fabrique une plutot que d'afficher un trou.
    members: Object.fromEntries(
      memberUids.map((uid) => [uid, members[uid] ?? 'Membre du foyer']),
    ),
  };
}

/**
 * S'assure que le prenom de l'utilisateur figure bien dans le foyer.
 * Necessaire pour les foyers crees avant l'ajout des prenoms, et pour
 * repercuter un changement de prenom.
 */
export async function ensureMemberName(
  groupId: string,
  uid: string,
  displayName: string,
): Promise<boolean> {
  const ref = doc(getDb(), 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const current = (snap.data().members ?? {})[uid];
  if (current === displayName) return false;

  await updateDoc(ref, { [`members.${uid}`]: displayName });
  return true;
}

export async function fetchUserGroupId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid));
  return snap.exists() ? (snap.data().groupId ?? null) : null;
}
