import type { AppData, ShoppingItem } from "@/types";
import { generateShoppingList, normalizeIngredientName } from "./helpers";
import { getUpcomingDateKeys } from "./date";

/** Donnees du foyer utiles a la liste de courses. */
type ShoppingData = AppData;

export const isExtraItem = (item: ShoppingItem) => Boolean((item as ShoppingItem & { isExtra?: boolean }).isExtra);

/**
 * Recalcule la partie "cuisine" de la liste d'apres les repas a venir, sans
 * perdre ce que le foyer a deja fait : un article deja coche le reste, les
 * ajouts manuels ("Cote maison") sont gardes tels quels, et ce qui a ete
 * signale comme deja au placard n'est pas rajoute.
 */
export function syncFoodItems<T extends ShoppingData>(prev: T): T {
  const generated = generateShoppingList(prev, getUpcomingDateKeys(prev.weekPlan));
  const generatedKeys = new Set(generated.map((i) => normalizeIngredientName(i.name)));
  // Un ingredient qui n'est plus au menu sort de la memoire "deja au placard" :
  // s'il revient la semaine suivante, il reapparaitra dans la liste.
  const dismissed = (prev.dismissedFood ?? []).filter((k) => generatedKeys.has(k));
  const dismissedSet = new Set(dismissed);

  const previous = new Map(
    prev.shoppingList.filter((i) => !isExtraItem(i)).map((i) => [normalizeIngredientName(i.name), i]),
  );
  const food: ShoppingItem[] = generated
    .filter((i) => !dismissedSet.has(normalizeIngredientName(i.name)))
    .map((i) => {
      const old = previous.get(normalizeIngredientName(i.name));
      return { id: old?.id ?? i.id, name: i.name, checked: old?.checked ?? false, isExtra: false } as ShoppingItem;
    });
  const extras = prev.shoppingList.filter(isExtraItem);

  return { ...prev, shoppingList: [...food, ...extras], dismissedFood: dismissed, shoppingListGenerated: true };
}

/** Apres un changement de menu ou de plat : la liste suit, si elle existe deja. */
export function keepListInSync<T extends ShoppingData>(next: T): T {
  return next.shoppingListGenerated ? syncFoodItems(next) : next;
}
