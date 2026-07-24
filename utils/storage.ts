import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '@/types';
import { createEmptyWeekPlan } from './helpers';

const defaultData: AppData = {
  categories: [],
  dishes: [],
  ingredients: [],
  weekPlan: createEmptyWeekPlan(),
  shoppingList: [],
  shoppingListGenerated: false,
};

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

export const loadAppData = async (groupId: string): Promise<AppData> => {
  const STORAGE_KEY = `@meal_helper_data_${groupId}`;
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) return defaultData;
    return migrateLegacyWeekPlan(JSON.parse(jsonValue));
  } catch (e) {
    console.error('Erreur de lecture locale :', e);
    return defaultData;
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
