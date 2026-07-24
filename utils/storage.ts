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

export const loadAppData = async (groupId: string): Promise<AppData> => {
  const STORAGE_KEY = `@meal_helper_data_${groupId}`;
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultData;
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
