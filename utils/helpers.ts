import { AppData, DayKey, WeekPlan } from "@/types";

export function createEmptyWeekPlan(): WeekPlan {
  return {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };
}

export function createDefaultData(): AppData {
  const catPates = { id: "cat-pates", name: "Pâtes" };
  const catRiz = { id: "cat-riz", name: "Riz" };

  const dishCarbonara = { id: "dish-carbonara", categoryId: catPates.id, name: "Carbonara" };
  const dishBolognaise = { id: "dish-bolognaise", categoryId: catPates.id, name: "Bolognaise" };
  const dishRizPoulet = { id: "dish-riz-poulet", categoryId: catRiz.id, name: "Riz au poulet" };

  return {
    categories: [catPates, catRiz],
    dishes: [dishCarbonara, dishBolognaise, dishRizPoulet],
    ingredients: [
      { id: "ing-1", dishId: dishCarbonara.id, name: "Lardons" },
      { id: "ing-2", dishId: dishCarbonara.id, name: "Crème" },
      { id: "ing-3", dishId: dishCarbonara.id, name: "Fromage râpé" },
      { id: "ing-4", dishId: dishCarbonara.id, name: "Tagliatelles" },
      { id: "ing-5", dishId: dishBolognaise.id, name: "Viande hachée" },
      { id: "ing-6", dishId: dishBolognaise.id, name: "Sauce tomate" },
      { id: "ing-7", dishId: dishBolognaise.id, name: "Spaghetti" },
      { id: "ing-8", dishId: dishRizPoulet.id, name: "Riz" },
      { id: "ing-9", dishId: dishRizPoulet.id, name: "Poulet" },
      { id: "ing-10", dishId: dishRizPoulet.id, name: "Crème" },
    ],
    weekPlan: createEmptyWeekPlan(),
    shoppingList: [],
    shoppingListGenerated: false,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

export function generateShoppingList(data: AppData): { id: string; name: string }[] {
  const seen = new Map<string, string>();

  for (const day of Object.keys(data.weekPlan) as DayKey[]) {
    const plan = data.weekPlan[day];
    if (!plan) continue;

    const dishIngredients = data.ingredients.filter((i) => i.dishId === plan.dishId);
    for (const ingredient of dishIngredients) {
      const key = normalizeIngredientName(ingredient.name);
      if (!seen.has(key)) {
        seen.set(key, ingredient.name.trim());
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((name) => ({ id: generateId("shop"), name }));
}
