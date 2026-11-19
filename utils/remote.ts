import { doc, getDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { AppData } from '@/types';
import { getDb } from './firebase';
import { normalizeWeekPlan } from './storage';

// Les donnees du foyer sont reparties en trois documents plutot qu'un seul
// gros blob : si l'un edite le garde-manger pendant que l'autre coche des
// courses, les deux ecritures ne se marchent plus dessus.
const DOCS = ['pantry', 'planning', 'shopping', 'calendar', 'library'] as const;

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
      dismissedFood: data.dismissedFood ?? [],
    },
    calendar: {
      events: data.events ?? [],
    },
    // Favoris et semaines types : a part, pour ne pas reecrire le
    // garde-manger a chaque coeur.
    library: {
      favoriteRecipeIds: data.favoriteRecipeIds ?? [],
      weekTemplates: data.weekTemplates ?? [],
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

  const [pantry, planning, shopping, calendar, library] = snaps.map((s) => (s.exists() ? s.data() : {}));

  // Un foyer alimente par une version anterieure peut encore stocker un seul
  // repas par jour : on convertit ici comme pour le cache local.
  return normalizeWeekPlan({
    categories: pantry.categories ?? [],
    dishes: pantry.dishes ?? [],
    ingredients: pantry.ingredients ?? [],
    weekPlan: planning.weekPlan ?? {},
    shoppingList: shopping.shoppingList ?? [],
    recurringExtras: shopping.recurringExtras ?? [],
    shoppingListGenerated: shopping.shoppingListGenerated ?? false,
    dismissedFood: shopping.dismissedFood ?? [],
    events: calendar.events ?? [],
    favoriteRecipeIds: library.favoriteRecipeIds ?? [],
    weekTemplates: library.weekTemplates ?? [],
  } as SharedAppData) as SharedAppData;
}

type DocName = (typeof DOCS)[number];

/** Traduit le contenu d'un document du foyer en fragment de donnees locales. */
function toPartial(name: DocName, raw: Record<string, unknown>): Partial<SharedAppData> {
  switch (name) {
    case 'pantry':
      return {
        categories: (raw.categories ?? []) as SharedAppData['categories'],
        dishes: (raw.dishes ?? []) as SharedAppData['dishes'],
        ingredients: (raw.ingredients ?? []) as SharedAppData['ingredients'],
      };
    case 'planning': {
      // Meme conversion que pour le cache local : un foyer alimente par une
      // version anterieure peut encore stocker un seul repas par jour.
      const { weekPlan } = normalizeWeekPlan({
        weekPlan: (raw.weekPlan ?? {}) as AppData['weekPlan'],
      } as AppData);
      return { weekPlan };
    }
    case 'shopping':
      return {
        shoppingList: (raw.shoppingList ?? []) as SharedAppData['shoppingList'],
        recurringExtras: (raw.recurringExtras ?? []) as string[],
        shoppingListGenerated: Boolean(raw.shoppingListGenerated),
        dismissedFood: (raw.dismissedFood ?? []) as string[],
      };
    case 'calendar':
      return { events: (raw.events ?? []) as SharedAppData['events'] };
    case 'library':
      return {
        favoriteRecipeIds: (raw.favoriteRecipeIds ?? []) as string[],
        weekTemplates: (raw.weekTemplates ?? []) as SharedAppData['weekTemplates'],
      };
  }
}

/**
 * Ecoute les donnees du foyer en continu : ce que l'autre telephone modifie
 * arrive ici sans attendre la prochaine ouverture de l'application.
 *
 * Les echos de nos propres ecritures sont ignores (`hasPendingWrites`), sans
 * quoi chaque envoi declencherait un aller-retour inutile.
 *
 * Renvoie la fonction de desabonnement.
 */
export function subscribeGroupData(
  groupId: string,
  onRemoteChange: (partial: Partial<SharedAppData>) => void,
): () => void {
  const db = getDb();

  const unsubscribes = DOCS.map((name) =>
    onSnapshot(
      doc(db, 'groups', groupId, 'data', name),
      (snap) => {
        if (!snap.exists() || snap.metadata.hasPendingWrites) return;
        onRemoteChange(toPartial(name, snap.data()));
      },
      () => {
        // Perte de connexion : la banniere de synchronisation informe deja
        // l'utilisateur, et Firestore reprendra l'ecoute tout seul.
      },
    ),
  );

  return () => unsubscribes.forEach((stop) => stop());
}

/** Ecrit les donnees du foyer. Tous les documents partent en une seule fois. */
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
