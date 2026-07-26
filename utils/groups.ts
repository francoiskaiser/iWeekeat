import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
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

export async function createGroup(uid: string, name: string): Promise<string> {
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
    });
    await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
    return code;
  }

  throw new Error("Impossible de generer un code de foyer, reessayez.");
}

export async function joinGroup(uid: string, rawCode: string): Promise<string> {
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
  if (!memberUids.includes(uid)) {
    await updateDoc(ref, { memberUids: arrayUnion(uid) });
  }
  await setDoc(doc(db, 'users', uid), { groupId: code }, { merge: true });
  return code;
}

export async function fetchGroupInfo(groupId: string): Promise<GroupInfo | null> {
  const snap = await getDoc(doc(getDb(), 'groups', groupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: groupId,
    name: data.name ?? 'Mon foyer',
    memberCount: (data.memberUids ?? []).length,
  };
}

export async function fetchUserGroupId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid));
  return snap.exists() ? (snap.data().groupId ?? null) : null;
}
