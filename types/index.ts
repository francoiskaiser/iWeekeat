export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Category {
  id: string;
  name: string;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
}

export interface Ingredient {
  id: string;
  dishId: string;
  name: string;
}

export interface DayPlan {
  categoryId: string;
  dishId: string;
}

// Clé = date ISO "YYYY-MM-DD" (pas le jour de semaine) pour distinguer
// une semaine réelle d'une autre et permettre de préparer la suivante à l'avance.
export type WeekPlan = Record<string, DayPlan | null>;

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface AppData {
  categories: Category[];
  dishes: Dish[];
  ingredients: Ingredient[];
  weekPlan: WeekPlan;
  shoppingList: ShoppingItem[];
  shoppingListGenerated: boolean;
}
