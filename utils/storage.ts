import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '@/types';
import { createDefaultData } from './helpers';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Les anciennes versions stockaient le planning par jour de semaine
// ("monday", "tuesday"...) sans notion de date réelle. Ce format ne
// peut pas être rattaché à une semaine précise : on le vide plutôt
// que de risquer d'afficher un repas sur le mauvais jour.
function migrateLegacyWeekPlan(data: AppData): AppData {
  const keys = Object.keys(data.weekPlan || {});
  const isLegacy = keys.length > 0 && keys.some((k) => !DATE_KEY_PATTERN.test(k));
  if (!isLegacy) return data;
  return {
    ...data,
    weekPlan: {},
    shoppingList: data.shoppingList.filter((i) => (i as { isExtra?: boolean }).isExtra),
    shoppingListGenerated: false,
  };
}

/**
 * Un jour ne portait qu'un seul repas (`DayPlan | null`) ; il en porte
 * desormais une liste. On convertit a la lecture plutot que de demander
 * une resaisie, aussi bien pour le cache local que pour les donnees du foyer.
 */
export function normalizeWeekPlan(data: AppData): AppData {
  const source = (data.weekPlan ?? {}) as Record<string, unknown>;
  const weekPlan: AppData['weekPlan'] = {};

  for (const [dateKey, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      if (value.length) weekPlan[dateKey] = value as AppData['weekPlan'][string];
    } else if (value && typeof value === 'object') {
      weekPlan[dateKey] = [value as AppData['weekPlan'][string][number]];
    }
    // null / undefined : la journee reste sans repas, on n'ecrit pas de cle.
  }

  return { ...data, weekPlan };
}

export const loadAppData = async (groupId: string): Promise<AppData> => {
  const STORAGE_KEY = `@meal_helper_data_${groupId}`;
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) return createDefaultData();
    return normalizeWeekPlan(migrateLegacyWeekPlan(JSON.parse(jsonValue)));
  } catch (e) {
    console.error('Erreur de lecture locale :', e);
    return createDefaultData();
  }
};

export const saveAppData = async (data: AppData, groupId: string) => {
  const STORAGE_KEY = `@meal_helper_data_${groupId}`;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur de sauvegarde locale :', e);
  }
};

// Modifications faites sur ce telephone mais pas encore envoyees au foyer
// (typiquement : saisies hors ligne). Tant que ce drapeau est leve, on pousse
// le local vers le cloud plutot que l'inverse, pour ne rien perdre.
const dirtyKey = (groupId: string) => `@meal_helper_dirty_${groupId}`;

export const loadPendingChanges = async (groupId: string): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(dirtyKey(groupId))) === '1';
  } catch {
    return false;
  }
};

export const savePendingChanges = async (groupId: string, pending: boolean) => {
  try {
    if (pending) await AsyncStorage.setItem(dirtyKey(groupId), '1');
    else await AsyncStorage.removeItem(dirtyKey(groupId));
  } catch (e) {
    console.error('Erreur de sauvegarde locale :', e);
  }
};
