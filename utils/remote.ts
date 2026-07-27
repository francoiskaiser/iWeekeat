import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { AppData } from '@/types';
import { getDb } from './firebase';

// Les donnees du foyer sont reparties en trois documents plutot qu'un seul
// gros blob : si l'un edite le garde-manger pendant que l'autre coche des
// courses, les deux ecritures ne se marchent plus dessus.
const DOCS = ['pantry', 'planning', 'shopping'] as const;

export type SharedAppData = AppData & { recurringExtras?: string[] };

function split(data: SharedAppData) {
  return {
    pantry: {
      categories: data.categories ?? [],
      dishes: data.dishes ?? [],
      ingredients: data.ingredients ?? [],
    },
    planning: {
      weekPlan: data.weekPlan ?? {},
    },
    shopping: {
      shoppingList: data.shoppingList ?? [],
      recurringExtras: data.recurringExtras ?? [],
      shoppingListGenerated: data.shoppingListGenerated ?? false,
    },
  };
}

/**
 * Lit les donnees partagees du foyer.
 * Renvoie null si le foyer n'a encore jamais ete synchronise.
 */
export async function pullGroupData(groupId: string): Promise<SharedAppData | null> {
  const db = getDb();
  const snaps = await Promise.all(
    DOCS.map((name) => getDoc(doc(db, 'groups', groupId, 'data', name))),
  );

  if (snaps.every((s) => !s.exists())) return null;

  const [pantry, planning, shopping] = snaps.map((s) => (s.exists() ? s.data() : {}));

  return {
    categories: pantry.categories ?? [],
    dishes: pantry.dishes ?? [],
    ingredients: pantry.ingredients ?? [],
    weekPlan: planning.weekPlan ?? {},
    shoppingList: shopping.shoppingList ?? [],
    recurringExtras: shopping.recurringExtras ?? [],
    shoppingListGenerated: shopping.shoppingListGenerated ?? false,
  };
}

/** Ecrit les donnees du foyer. Les trois documents partent en une seule fois. */
export async function pushGroupData(groupId: string, data: SharedAppData): Promise<void> {
  const db = getDb();
  const parts = split(data);
  const batch = writeBatch(db);

  for (const name of DOCS) {
    batch.set(doc(db, 'groups', groupId, 'data', name), {
      ...parts[name],
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
