import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { AppData, CalendarEvent, Category, DayPlan, Dish, Ingredient, ShoppingItem } from "@/types";
import { generateId, generateShoppingList } from "@/utils/helpers";
import { loadAppData, loadPendingChanges, saveAppData, savePendingChanges } from "@/utils/storage";
import { pullGroupData, pushGroupData } from "@/utils/remote";
import { getUpcomingDateKeys, isDateKeyUpcoming } from "@/utils/date";

import { useAuth } from "./AuthContext";

export type ExtendedShoppingItem = ShoppingItem & { isExtra?: boolean };
type ExtendedAppData = AppData & { recurringExtras?: string[] };

export interface CleanItem {
  name: string;
  isExtra: boolean;
}

interface AppContextValue {
  data: ExtendedAppData;
  loading: boolean;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addDish: (categoryId: string, name: string) => void;
  updateDish: (id: string, name: string) => void;
  deleteDish: (id: string) => void;
  addIngredient: (dishId: string, name: string) => void;
  updateIngredient: (id: string, name: string) => void;
  deleteIngredient: (id: string) => void;
  setDayPlan: (dateKey: string, plan: DayPlan | null) => void;
  generateList: () => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  addExtraItem: (name: string) => void;
  deleteExtraByName: (name: string) => void;
  startCleanMode: () => CleanItem[];
  applyCleanResults: (remainingItems: CleanItem[]) => void;
  resetWeekPlan: (dateKeys: string[]) => void;
  randomizeWeek: (dateKeys: string[]) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, changes: Partial<Omit<CalendarEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;
  /** Retire une seule occurrence d'une serie recurrente. */
  deleteOccurrence: (id: string, dateKey: string) => void;
  syncing: boolean;
  syncError: string | null;
  syncNow: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ExtendedAppData | null>(null);
  const [loading, setLoading] = useState(true);

  const { groupId } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Dernier etat connu des donnees, lisible depuis les callbacks asynchrones
  // sans les recreer a chaque frappe.
  const dataRef = useRef<ExtendedAppData | null>(null);
  const [pushTick, setPushTick] = useState(0);

  useEffect(() => { dataRef.current = data; }, [data]);

  /**
   * Reconcilie le cache local et le foyer.
   * Regle : si ce telephone a des modifications non envoyees, elles gagnent ;
   * sinon le foyer fait autorite. Un foyer encore vide est amorce avec le
   * contenu local (ce qui importe les plats deja saisis avant la connexion).
   */
  const reconcile = useCallback(async (group: string) => {
    setSyncing(true);
    try {
      const local = dataRef.current;
      const hasPending = await loadPendingChanges(group);

      if (hasPending && local) {
        await pushGroupData(group, local);
        await savePendingChanges(group, false);
      } else {
        const remote = await pullGroupData(group);
        if (remote) {
          setData(remote as ExtendedAppData);
          dataRef.current = remote as ExtendedAppData;
          await saveAppData(remote, group);
        } else if (local) {
          await pushGroupData(group, local);
        }
      }
      setSyncError(null);
    } catch {
      setSyncError('Donnees non synchronisees (hors ligne ?)');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Chargement initial : le cache local s'affiche tout de suite, la
  // synchronisation se fait ensuite en arriere-plan.
  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;
    setLoading(true);
    loadAppData(groupId).then((loaded) => {
      if (cancelled) return;
      setData(loaded as ExtendedAppData);
      dataRef.current = loaded as ExtendedAppData;
      setLoading(false);
      reconcile(groupId);
    });
    return () => { cancelled = true; };
  }, [groupId, reconcile]);

  // Retour au premier plan : on resynchronise pour recuperer ce que l'autre
  // telephone a pu changer entre-temps.
  useEffect(() => {
    if (!groupId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile(groupId);
    });
    return () => sub.remove();
  }, [groupId, reconcile]);

  // Envoi differe apres modification : evite une ecriture par frappe clavier.
  useEffect(() => {
    if (!groupId || pushTick === 0) return;
    const timer = setTimeout(async () => {
      const current = dataRef.current;
      if (!current) return;
      setSyncing(true);
      try {
        await pushGroupData(groupId, current);
        await savePendingChanges(groupId, false);
        setSyncError(null);
      } catch {
        setSyncError('Modifications enregistrees sur ce telephone uniquement');
      } finally {
        setSyncing(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [pushTick, groupId]);

  const persist = useCallback((updater: (prev: ExtendedAppData) => ExtendedAppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (groupId) saveAppData(next, groupId);
      dataRef.current = next;
      return next;
    });
    if (groupId) {
      savePendingChanges(groupId, true);
      setPushTick((t) => t + 1);
    }
  }, [groupId]);

  const syncNow = useCallback(() => {
    if (groupId) reconcile(groupId);
  }, [groupId, reconcile]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, categories: [...prev.categories, { id: generateId("cat"), name: trimmed }] }));
  }, [persist]);

  const updateCategory = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, categories: prev.categories.map((c) => c.id === id ? { ...c, name: trimmed } : c) }));
  }, [persist]);

  const deleteCategory = useCallback((id: string) => {
    persist((prev) => {
      const dishIds = prev.dishes.filter((d) => d.categoryId === id).map((d) => d.id);
      const newWeekPlan = { ...prev.weekPlan };
      for (const dateKey of Object.keys(newWeekPlan)) {
        if (newWeekPlan[dateKey]?.categoryId === id) newWeekPlan[dateKey] = null;
      }
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        dishes: prev.dishes.filter((d) => d.categoryId !== id),
        ingredients: prev.ingredients.filter((i) => !dishIds.includes(i.dishId)),
        weekPlan: newWeekPlan,
      };
    });
  }, [persist]);

  const addDish = useCallback((categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, dishes: [...prev.dishes, { id: generateId("dish"), categoryId, name: trimmed }] }));
  }, [persist]);

  const updateDish = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, dishes: prev.dishes.map((d) => (d.id === id ? { ...d, name: trimmed } : d)) }));
  }, [persist]);

  const deleteDish = useCallback((id: string) => {
    persist((prev) => {
      const newWeekPlan = { ...prev.weekPlan };
      for (const dateKey of Object.keys(newWeekPlan)) {
        if (newWeekPlan[dateKey]?.dishId === id) newWeekPlan[dateKey] = null;
      }
      return {
        ...prev,
        dishes: prev.dishes.filter((d) => d.id !== id),
        ingredients: prev.ingredients.filter((i) => i.dishId !== id),
        weekPlan: newWeekPlan,
      };
    });
  }, [persist]);

  const addIngredient = useCallback((dishId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, ingredients: [...prev.ingredients, { id: generateId("ing"), dishId, name: trimmed }] }));
  }, [persist]);

  const updateIngredient = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({ ...prev, ingredients: prev.ingredients.map((i) => i.id === id ? { ...i, name: trimmed } : i) }));
  }, [persist]);

  const deleteIngredient = useCallback((id: string) => {
    persist((prev) => ({ ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) }));
  }, [persist]);

  const setDayPlan = useCallback((dateKey: string, plan: DayPlan | null) => {
    persist((prev) => {
      const invalidatesShopping = isDateKeyUpcoming(dateKey);
      return {
        ...prev,
        weekPlan: { ...prev.weekPlan, [dateKey]: plan },
        shoppingListGenerated: invalidatesShopping ? false : prev.shoppingListGenerated,
      };
    });
  }, [persist]);

  const generateList = useCallback(() => {
    persist((prev) => {
      const foodItems = generateShoppingList(prev, getUpcomingDateKeys(prev.weekPlan)).map(
        (item): ExtendedShoppingItem => ({ ...item, checked: false, isExtra: false })
      );
      const extraItems = prev.shoppingList.filter((i) => (i as ExtendedShoppingItem).isExtra);
      return { ...prev, shoppingList: [...foodItems, ...extraItems], shoppingListGenerated: true };
    });
  }, [persist]);

  // MODIFIÉ : Devient plus intelligent pour éviter les doublons et réactiver un élément coché
  const addExtraItem = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => {
      const currentExtras = prev.recurringExtras || [];
      const newRecurring = currentExtras.includes(trimmed) ? currentExtras : [...currentExtras, trimmed];
      
      const existingIndex = prev.shoppingList.findIndex(i => i.name.toLowerCase() === trimmed.toLowerCase());
      let newShoppingList = [...prev.shoppingList];
      
      if (existingIndex >= 0) {
        // S'il existe déjà (ex: coché), on le remet à neuf (décoché) pour qu'il réapparaisse
        newShoppingList[existingIndex] = { ...newShoppingList[existingIndex], checked: false };
      } else {
        // Sinon on le crée
        newShoppingList.push({ id: generateId("shop"), name: trimmed, checked: false, isExtra: true } as ExtendedShoppingItem);
      }

      return {
        ...prev,
        shoppingList: newShoppingList,
        recurringExtras: newRecurring,
        shoppingListGenerated: prev.shoppingListGenerated || prev.shoppingList.length > 0
      };
    });
  }, [persist]);

  const removeShoppingItem = useCallback((id: string) => {
    persist((prev) => {
      const itemToRemove = prev.shoppingList.find(i => i.id === id) as ExtendedShoppingItem;
      let newRecurring = prev.recurringExtras || [];
      if (itemToRemove && itemToRemove.isExtra) {
          newRecurring = newRecurring.filter(name => name !== itemToRemove.name);
      }
      return { ...prev, shoppingList: prev.shoppingList.filter(item => item.id !== id), recurringExtras: newRecurring };
    });
  }, [persist]);

  // NOUVEAU : Supprime définitivement de la mémoire des indispensables
  const deleteExtraByName = useCallback((name: string) => {
    persist((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter(i => i.name.toLowerCase() !== name.toLowerCase()),
      recurringExtras: (prev.recurringExtras || []).filter(n => n.toLowerCase() !== name.toLowerCase())
    }));
  }, [persist]);

  const toggleShoppingItem = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
    }));
  }, [persist]);

  const startCleanMode = useCallback((): CleanItem[] => {
    if (!data) return [];
    
    const foodItems = data.shoppingList
        .filter((i) => !(i as ExtendedShoppingItem).isExtra)
        .map(i => ({ name: i.name, isExtra: false }));
        
    const recurringExtras = (data.recurringExtras || []).map(name => ({ name, isExtra: true }));
    
    const allItems = [...foodItems, ...recurringExtras];
    const uniqueItems: CleanItem[] = [];
    const seen = new Set();
    
    for (const item of allItems) {
        if (!seen.has(item.name.toLowerCase())) {
            seen.add(item.name.toLowerCase());
            uniqueItems.push(item);
        }
    }
    return uniqueItems;
  }, [data]);

  const applyCleanResults = useCallback((remainingItems: CleanItem[]) => {
    persist((prev) => {
      const newShoppingList = remainingItems.map((item) => {
        const existing = prev.shoppingList.find(i => i.name === item.name);
        return { id: existing?.id || generateId("shop"), name: item.name, checked: false, isExtra: item.isExtra };
      });
      return { ...prev, shoppingList: newShoppingList };
    });
  }, [persist]);

  const resetWeekPlan = useCallback((dateKeys: string[]) => {
    persist((prev) => {
      const newWeekPlan = { ...prev.weekPlan };
      for (const dateKey of dateKeys) newWeekPlan[dateKey] = null;

      const touchesUpcoming = dateKeys.some((k) => isDateKeyUpcoming(k));
      return {
        ...prev,
        weekPlan: newWeekPlan,
        shoppingList: touchesUpcoming ? [] : prev.shoppingList,
        shoppingListGenerated: touchesUpcoming ? false : prev.shoppingListGenerated,
      };
    });
  }, [persist]);

  const randomizeWeek = useCallback((dateKeys: string[]) => {
    persist((prev) => {
      if (prev.dishes.length === 0) return prev;
      const shuffledDishes = [...prev.dishes].sort(() => 0.5 - Math.random());
      const newWeekPlan = { ...prev.weekPlan };

      dateKeys.forEach((dateKey, index) => {
        const dish = shuffledDishes[index % shuffledDishes.length];
        newWeekPlan[dateKey] = { categoryId: dish.categoryId, dishId: dish.id };
      });

      const touchesUpcoming = dateKeys.some((k) => isDateKeyUpcoming(k));
      return {
        ...prev,
        weekPlan: newWeekPlan,
        shoppingListGenerated: touchesUpcoming ? false : prev.shoppingListGenerated,
      };
    });
  }, [persist]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    persist((prev) => ({
      ...prev,
      events: [...(prev.events ?? []), { ...event, id: generateId('evt') }],
    }));
  }, [persist]);

  const updateEvent = useCallback((id: string, changes: Partial<Omit<CalendarEvent, 'id'>>) => {
    persist((prev) => ({
      ...prev,
      events: (prev.events ?? []).map((e) => (e.id === id ? { ...e, ...changes } : e)),
    }));
  }, [persist]);

  const deleteEvent = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      events: (prev.events ?? []).filter((e) => e.id !== id),
    }));
  }, [persist]);

  const deleteOccurrence = useCallback((id: string, dateKey: string) => {
    persist((prev) => ({
      ...prev,
      events: (prev.events ?? []).map((e) =>
        e.id === id
          ? { ...e, excludedDates: [...(e.excludedDates ?? []), dateKey] }
          : e,
      ),
    }));
  }, [persist]);

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null;
    return {
      data, loading, addCategory, updateCategory, deleteCategory, addDish, updateDish, deleteDish,
      addIngredient, updateIngredient, deleteIngredient, setDayPlan, generateList, toggleShoppingItem,
      removeShoppingItem, addExtraItem, deleteExtraByName, startCleanMode, applyCleanResults, resetWeekPlan, randomizeWeek,
      addEvent, updateEvent, deleteEvent, deleteOccurrence,
      syncing, syncError, syncNow,
    };
  }, [
    data, loading, addCategory, updateCategory, deleteCategory, addDish, updateDish, deleteDish,
    addIngredient, updateIngredient, deleteIngredient, setDayPlan, generateList, toggleShoppingItem,
    removeShoppingItem, addExtraItem, deleteExtraByName, startCleanMode, applyCleanResults, resetWeekPlan, randomizeWeek,
    addEvent, updateEvent, deleteEvent, deleteOccurrence,
    syncing, syncError, syncNow,
  ]);

  if (!groupId) {
    return null; // En attente de redirection vers la connexion ou le choix du foyer
  }

  if (loading || !value) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#FFFBF5' }}>
        <ActivityIndicator size="large" color="#FF7A41" />
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}



export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
export type { Category, Dish, Ingredient };