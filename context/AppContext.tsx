import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { AppData, CalendarEvent, Category, DayPlan, Dish, Ingredient, Recipe, ShoppingItem, WeekTemplate } from "@/types";
import { findPantryCategory, categoryLabel } from "@/utils/recipeCategories";
import { generateId, generateShoppingList, normalizeIngredientName } from "@/utils/helpers";
import { isExtraItem, keepListInSync, syncFoodItems } from "@/utils/shopping";
import { loadAppData, loadPendingChanges, saveAppData, savePendingChanges } from "@/utils/storage";
import { pullGroupData, pushGroupData, subscribeGroupData } from "@/utils/remote";
import { getUpcomingDateKeys } from "@/utils/date";
import { rescheduleReminders } from "@/utils/reminders";

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
  /**
   * Copie une recette du catalogue dans le garde-manger du foyer : le plat
   * devient utilisable dans le semainier et la liste de courses.
   * Renvoie l'identifiant du plat (existant si la recette etait deja ajoutee).
   */
  addRecipeToPantry: (recipe: Recipe) => { dishId: string; alreadyThere: boolean };
  /** Ajoute un repas au jour, ou le remplace si un index est fourni. */
  addDayPlan: (dateKey: string, plan: DayPlan, replaceIndex?: number) => void;
  /** Retire un repas precis du jour. */
  removeDayPlan: (dateKey: string, index: number) => void;
  /** Vide entierement la journee. */
  clearDay: (dateKey: string) => void;
  /** Cree ou actualise la liste ; les cases deja cochees restent cochees. */
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
  addComment: (eventId: string, uid: string, text: string) => void;
  deleteComment: (eventId: string, commentId: string) => void;
  toggleFavoriteRecipe: (recipeId: string) => void;
  /** Enregistre les 7 jours donnes (lundi a dimanche) comme semaine type. */
  saveWeekTemplate: (name: string, weekDateKeys: string[]) => void;
  /** Applique une semaine type ; seuls les jours donnes (a venir) sont remplis. */
  applyWeekTemplate: (templateId: string, weekDateKeys: string[], allowedDateKeys: string[]) => void;
  deleteWeekTemplate: (templateId: string) => void;
  syncing: boolean;
  syncError: string | null;
  syncNow: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ExtendedAppData | null>(null);
  const [loading, setLoading] = useState(true);

  const { groupId, user } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Dernier etat connu des donnees, lisible depuis les callbacks asynchrones
  // sans les recreer a chaque frappe.
  const dataRef = useRef<ExtendedAppData | null>(null);
  // Version synchrone du drapeau "modifications non envoyees" : l'ecoute temps
  // reel doit pouvoir le consulter immediatement, sans attendre AsyncStorage.
  const pendingRef = useRef(false);
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
        pendingRef.current = false;
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
      setSyncError('Données non synchronisées (hors ligne ?)');
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

  // Ecoute continue du foyer : ce que l'autre telephone modifie apparait ici
  // dans la seconde, sans rouvrir l'application.
  useEffect(() => {
    if (!groupId) return;

    return subscribeGroupData(groupId, (partial) => {
      // Si ce telephone a des modifications pas encore envoyees, elles priment :
      // notre propre envoi suit dans un instant et fera autorite. Appliquer le
      // distant maintenant les effacerait.
      if (pendingRef.current) return;

      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        dataRef.current = next;
        saveAppData(next, groupId);
        return next;
      });
      setSyncError(null);
    });
  }, [groupId]);

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
        pendingRef.current = false;
        setSyncError(null);
      } catch {
        setSyncError('Modifications enregistrées sur ce téléphone uniquement');
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
      pendingRef.current = true;
      savePendingChanges(groupId, true);
      setPushTick((t) => t + 1);
    }
  }, [groupId]);

  const syncNow = useCallback(() => {
    if (groupId) reconcile(groupId);
  }, [groupId, reconcile]);

  // Les rappels sont replanifies des que les evenements changent, qu'ils
  // viennent d'une saisie locale ou d'une synchronisation : ainsi un
  // rendez-vous ajoute par l'autre telephone declenche aussi une alerte ici.
  const uid = user?.uid;
  const events = data?.events;
  useEffect(() => {
    if (!uid || !events) return;
    rescheduleReminders(events, uid);
  }, [events, uid]);

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
        const kept = newWeekPlan[dateKey].filter((p) => p.categoryId !== id);
        if (kept.length) newWeekPlan[dateKey] = kept;
        else delete newWeekPlan[dateKey];
      }
      return keepListInSync({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        dishes: prev.dishes.filter((d) => d.categoryId !== id),
        ingredients: prev.ingredients.filter((i) => !dishIds.includes(i.dishId)),
        weekPlan: newWeekPlan,
      });
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
        const kept = newWeekPlan[dateKey].filter((p) => p.dishId !== id);
        if (kept.length) newWeekPlan[dateKey] = kept;
        else delete newWeekPlan[dateKey];
      }
      return keepListInSync({
        ...prev,
        dishes: prev.dishes.filter((d) => d.id !== id),
        ingredients: prev.ingredients.filter((i) => i.dishId !== id),
        weekPlan: newWeekPlan,
      });
    });
  }, [persist]);

  const addIngredient = useCallback((dishId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => keepListInSync({ ...prev, ingredients: [...prev.ingredients, { id: generateId("ing"), dishId, name: trimmed }] }));
  }, [persist]);

  const updateIngredient = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => keepListInSync({ ...prev, ingredients: prev.ingredients.map((i) => i.id === id ? { ...i, name: trimmed } : i) }));
  }, [persist]);

  const deleteIngredient = useCallback((id: string) => {
    persist((prev) => keepListInSync({ ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) }));
  }, [persist]);

  const addRecipeToPantry = useCallback((recipe: Recipe) => {
    const existing = dataRef.current?.dishes.find((d) => d.recipeId === recipe.id);
    if (existing) return { dishId: existing.id, alreadyThere: true };

    const dishId = generateId("dish");
    persist((prev) => {
      if (prev.dishes.some((d) => d.recipeId === recipe.id)) return prev;

      // On range le plat dans la categorie du foyer qui correspond ("Viandes"
      // pour une recette "Viande"), ou on la cree si le foyer n'en a pas.
      let categories = prev.categories;
      let categoryId = findPantryCategory(prev.categories, recipe.category)?.id;
      if (!categoryId) {
        categoryId = generateId("cat");
        categories = [...categories, { id: categoryId, name: categoryLabel(recipe.category) }];
      }

      return {
        ...prev,
        categories,
        dishes: [...prev.dishes, { id: dishId, categoryId, name: recipe.title, recipeId: recipe.id }],
        ingredients: [
          ...prev.ingredients,
          ...recipe.ingredients.map((i) => ({ id: generateId("ing"), dishId, name: i.name })),
        ],
      };
    });
    return { dishId, alreadyThere: false };
  }, [persist]);

  const writeDay = useCallback((dateKey: string, next: DayPlan[]) => {
    persist((prev) => {
      const weekPlan = { ...prev.weekPlan };
      if (next.length) weekPlan[dateKey] = next;
      else delete weekPlan[dateKey];

      return keepListInSync({ ...prev, weekPlan });
    });
  }, [persist]);

  const addDayPlan = useCallback((dateKey: string, plan: DayPlan, replaceIndex?: number) => {
    const current = dataRef.current?.weekPlan[dateKey] ?? [];
    const next = [...current];
    if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < next.length) {
      next[replaceIndex] = plan;
    } else {
      next.push(plan);
    }
    writeDay(dateKey, next);
  }, [writeDay]);

  const removeDayPlan = useCallback((dateKey: string, index: number) => {
    const current = dataRef.current?.weekPlan[dateKey] ?? [];
    writeDay(dateKey, current.filter((_, i) => i !== index));
  }, [writeDay]);

  const clearDay = useCallback((dateKey: string) => {
    writeDay(dateKey, []);
  }, [writeDay]);

  const generateList = useCallback(() => {
    persist(syncFoodItems);
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
    
    // Tout ce que le menu demande, y compris ce qui avait ete marque "deja au
    // placard" la fois precedente : le placard a pu se vider depuis.
    const foodItems = [
      ...data.shoppingList.filter((i) => !isExtraItem(i)).map((i) => i.name),
      ...generateShoppingList(data, getUpcomingDateKeys(data.weekPlan)).map((i) => i.name),
    ].map((name) => ({ name, isExtra: false }));
        
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
      // Les ingredients du menu que l'on a deja ne reviendront pas quand la
      // liste se mettra a jour toute seule.
      const keptKeys = new Set(remainingItems.map((i) => normalizeIngredientName(i.name)));
      const dismissedFood = generateShoppingList(prev, getUpcomingDateKeys(prev.weekPlan))
        .map((i) => normalizeIngredientName(i.name))
        .filter((k) => !keptKeys.has(k));
      return { ...prev, shoppingList: newShoppingList, dismissedFood, shoppingListGenerated: true };
    });
  }, [persist]);

  const resetWeekPlan = useCallback((dateKeys: string[]) => {
    persist((prev) => {
      const newWeekPlan = { ...prev.weekPlan };
      for (const dateKey of dateKeys) delete newWeekPlan[dateKey];

      return keepListInSync({ ...prev, weekPlan: newWeekPlan });
    });
  }, [persist]);

  const randomizeWeek = useCallback((dateKeys: string[]) => {
    persist((prev) => {
      if (prev.dishes.length === 0) return prev;
      const shuffledDishes = [...prev.dishes].sort(() => 0.5 - Math.random());
      const newWeekPlan = { ...prev.weekPlan };

      // Le tirage aleatoire remplace la journee par un unique repas.
      dateKeys.forEach((dateKey, index) => {
        const dish = shuffledDishes[index % shuffledDishes.length];
        newWeekPlan[dateKey] = [{ categoryId: dish.categoryId, dishId: dish.id }];
      });

      return keepListInSync({ ...prev, weekPlan: newWeekPlan });
    });
  }, [persist]);

  const toggleFavoriteRecipe = useCallback((recipeId: string) => {
    persist((prev) => {
      const current = prev.favoriteRecipeIds ?? [];
      return {
        ...prev,
        favoriteRecipeIds: current.includes(recipeId)
          ? current.filter((id) => id !== recipeId)
          : [...current, recipeId],
      };
    });
  }, [persist]);

  const saveWeekTemplate = useCallback((name: string, weekDateKeys: string[]) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => {
      const template: WeekTemplate = {
        id: generateId("tpl"),
        name: trimmed,
        days: weekDateKeys.map((k) => prev.weekPlan[k] ?? []),
      };
      return { ...prev, weekTemplates: [...(prev.weekTemplates ?? []), template] };
    });
  }, [persist]);

  const applyWeekTemplate = useCallback((templateId: string, weekDateKeys: string[], allowedDateKeys: string[]) => {
    persist((prev) => {
      const template = (prev.weekTemplates ?? []).find((t) => t.id === templateId);
      if (!template) return prev;
      const weekPlan = { ...prev.weekPlan };
      weekDateKeys.forEach((dateKey, index) => {
        if (!allowedDateKeys.includes(dateKey)) return;
        // Un plat supprime du garde-manger depuis l'enregistrement est ignore.
        const meals = (template.days[index] ?? []).filter((m) => prev.dishes.some((d) => d.id === m.dishId));
        // Un jour vide dans le modele ne vide pas un jour deja planifie.
        if (meals.length) weekPlan[dateKey] = meals;
      });
      return keepListInSync({ ...prev, weekPlan });
    });
  }, [persist]);

  const deleteWeekTemplate = useCallback((templateId: string) => {
    persist((prev) => ({ ...prev, weekTemplates: (prev.weekTemplates ?? []).filter((t) => t.id !== templateId) }));
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

  const addComment = useCallback((eventId: string, uid: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    persist((prev) => ({
      ...prev,
      events: (prev.events ?? []).map((e) =>
        e.id === eventId
          ? {
              ...e,
              comments: [
                ...(e.comments ?? []),
                { id: generateId('cmt'), uid, text: trimmed, at: new Date().toISOString() },
              ],
            }
          : e,
      ),
    }));
  }, [persist]);

  const deleteComment = useCallback((eventId: string, commentId: string) => {
    persist((prev) => ({
      ...prev,
      events: (prev.events ?? []).map((e) =>
        e.id === eventId
          ? { ...e, comments: (e.comments ?? []).filter((c) => c.id !== commentId) }
          : e,
      ),
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
      addIngredient, updateIngredient, deleteIngredient, addRecipeToPantry, addDayPlan, removeDayPlan, clearDay, generateList, toggleShoppingItem,
      removeShoppingItem, addExtraItem, deleteExtraByName, startCleanMode, applyCleanResults, resetWeekPlan, randomizeWeek,
      addEvent, updateEvent, deleteEvent, deleteOccurrence, addComment, deleteComment,
      toggleFavoriteRecipe, saveWeekTemplate, applyWeekTemplate, deleteWeekTemplate,
      syncing, syncError, syncNow,
    };
  }, [
    data, loading, addCategory, updateCategory, deleteCategory, addDish, updateDish, deleteDish,
    addIngredient, updateIngredient, deleteIngredient, addRecipeToPantry, addDayPlan, removeDayPlan, clearDay, generateList, toggleShoppingItem,
    removeShoppingItem, addExtraItem, deleteExtraByName, startCleanMode, applyCleanResults, resetWeekPlan, randomizeWeek,
    addEvent, updateEvent, deleteEvent, deleteOccurrence, addComment, deleteComment,
    toggleFavoriteRecipe, saveWeekTemplate, applyWeekTemplate, deleteWeekTemplate,
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