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

export type WeekPlan = Record<DayKey, DayPlan | null>;

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
