import type { Category, RecipeCategory } from "@/types";
import { categoryLabel } from "@/constants/recipes";

export { categoryLabel };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Noms qu'un foyer a pu donner a ses categories, pour chaque categorie du
// catalogue. Compare sans accents ni majuscules.
const ALIASES: Record<RecipeCategory, string[]> = {
  classiques: ["classiques", "classique", "plats classiques", "traditionnel", "belge"],
  pates: ["pates", "pate"],
  viande: ["viande", "viandes"],
  poisson: ["poisson", "poissons", "poisson et fruits de mer"],
  vegetarien: ["vegetarien", "vegetarienne", "vege", "veggie"],
  soupes: ["soupes", "soupe", "potage", "potages"],
  "riz-cereales": ["riz et cereales", "riz", "cereales"],
  rapides: ["plats rapides", "rapide", "rapides", "express"],
};

/** Categorie du foyer correspondant a une categorie du catalogue, si elle existe. */
export function findPantryCategory(categories: Category[], recipeCategory: RecipeCategory): Category | undefined {
  const names = ALIASES[recipeCategory];
  return categories.find((c) => names.includes(normalize(c.name)));
}

/** Devine la categorie du catalogue d'apres le nom d'une categorie du foyer. */
export function guessRecipeCategory(pantryCategoryName: string | undefined): RecipeCategory {
  const name = normalize(pantryCategoryName ?? "");
  for (const [id, names] of Object.entries(ALIASES) as [RecipeCategory, string[]][]) {
    if (names.includes(name)) return id;
  }
  return "classiques";
}
