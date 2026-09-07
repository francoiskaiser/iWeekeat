import { AppData, WeekPlan } from "@/types";

export function createEmptyWeekPlan(): WeekPlan {
  return {};
}

/**
 * Garde-manger propose au premier lancement : des plats de tous les jours,
 * volontairement simples, pour que l'application soit utilisable
 * immediatement plutot que de demander une longue saisie.
 *
 * Les noms de categories contiennent "viande", "poisson" et "vege" : le
 * semainier s'en sert pour colorer les repas.
 */
const DEFAULT_PANTRY: { category: string; dishes: { name: string; ingredients: string[] }[] }[] = [
  {
    category: "Pâtes",
    dishes: [
      { name: "Carbonara", ingredients: ["Tagliatelles", "Lardons", "Crème fraîche", "Parmesan", "Œufs"] },
      { name: "Bolognaise", ingredients: ["Spaghetti", "Viande hachée", "Sauce tomate", "Oignon", "Ail"] },
      { name: "Pâtes au thon", ingredients: ["Penne", "Thon en boîte", "Sauce tomate", "Olives noires"] },
    ],
  },
  {
    category: "Riz",
    dishes: [
      { name: "Riz cantonais", ingredients: ["Riz", "Œufs", "Petits pois", "Jambon", "Oignon"] },
      { name: "Risotto aux champignons", ingredients: ["Riz arborio", "Champignons", "Bouillon de légumes", "Parmesan", "Oignon"] },
      { name: "Curry de pois chiches", ingredients: ["Riz", "Pois chiches", "Lait de coco", "Curry", "Oignon"] },
    ],
  },
  {
    category: "Viandes",
    dishes: [
      { name: "Poulet rôti et pommes de terre", ingredients: ["Poulet", "Pommes de terre", "Beurre", "Thym"] },
      { name: "Steak haché haricots verts", ingredients: ["Steak haché", "Haricots verts", "Beurre"] },
      { name: "Escalope à la crème", ingredients: ["Escalope de dinde", "Crème fraîche", "Champignons", "Riz"] },
    ],
  },
  {
    category: "Poissons",
    dishes: [
      { name: "Saumon à la poêle", ingredients: ["Pavé de saumon", "Citron", "Beurre", "Riz"] },
      { name: "Cabillaud au four", ingredients: ["Dos de cabillaud", "Tomates cerises", "Huile d'olive", "Herbes de Provence"] },
      { name: "Papillote de colin", ingredients: ["Filet de colin", "Carottes", "Courgettes", "Citron"] },
    ],
  },
  {
    category: "Végétarien",
    dishes: [
      { name: "Omelette aux champignons", ingredients: ["Œufs", "Champignons", "Beurre", "Persil"] },
      { name: "Quiche aux courgettes", ingredients: ["Pâte brisée", "Œufs", "Crème fraîche", "Courgettes", "Fromage râpé"] },
      { name: "Soupe de légumes", ingredients: ["Carottes", "Poireaux", "Pommes de terre", "Oignon"] },
    ],
  },
];

/** Identifiant stable et lisible, deduit du nom. */
function slug(prefix: string, name: string, index: number): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${prefix}-${base}-${index}`;
}

export function createDefaultData(): AppData {
  const categories: AppData["categories"] = [];
  const dishes: AppData["dishes"] = [];
  const ingredients: AppData["ingredients"] = [];

  DEFAULT_PANTRY.forEach((entry, ci) => {
    const categoryId = slug("cat", entry.category, ci);
    categories.push({ id: categoryId, name: entry.category });

    entry.dishes.forEach((dish, di) => {
      const dishId = slug("dish", dish.name, ci * 100 + di);
      dishes.push({ id: dishId, categoryId, name: dish.name });

      dish.ingredients.forEach((name, ii) => {
        ingredients.push({ id: slug("ing", name, ci * 10000 + di * 100 + ii), dishId, name });
      });
    });
  });

  return {
    categories,
    dishes,
    ingredients,
    weekPlan: createEmptyWeekPlan(),
    shoppingList: [],
    shoppingListGenerated: false,
    events: [],
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

export function generateShoppingList(data: AppData, dateKeys: string[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();

  for (const dateKey of dateKeys) {
    for (const plan of data.weekPlan[dateKey] ?? []) {
      const dishIngredients = data.ingredients.filter((i) => i.dishId === plan.dishId);
      for (const ingredient of dishIngredients) {
        const key = normalizeIngredientName(ingredient.name);
        if (!seen.has(key)) {
          seen.set(key, ingredient.name.trim());
        }
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((name) => ({ id: generateId("shop"), name }));
}
