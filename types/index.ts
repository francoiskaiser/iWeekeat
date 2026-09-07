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
// Valeur = liste des repas du jour : un foyer peut en prévoir plusieurs
// (midi et soir, ou un plat et un dessert).
export type WeekPlan = Record<string, DayPlan[]>;

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

/** Message laisse sur un evenement par un membre du foyer. */
export interface EventComment {
  id: string;
  /** Auteur ; traduit en prenom a l'affichage. */
  uid: string;
  text: string;
  /** Date ISO complete. */
  at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** Date ISO "YYYY-MM-DD". Pour un evenement recurrent, c'est la premiere occurrence. */
  date: string;
  allDay: boolean;
  /** "HH:MM" — absents si allDay. */
  startTime?: string;
  endTime?: string;
  note?: string;
  /** Lieu libre : adresse, salle, ville... */
  location?: string;
  /**
   * Identifiants des membres concernes. Vide = tout le foyer.
   * On stocke des uid et non "moi"/"elle" : la notion est relative a
   * celui qui regarde, chaque telephone traduit a l'affichage.
   */
  assignedTo: string[];
  recurrence: Recurrence;
  /** Occurrences supprimees a l'unite d'une serie recurrente. */
  excludedDates?: string[];
  /** Minutes avant l'evenement pour le rappel local. null = aucun rappel. */
  reminderMinutes?: number | null;
  createdBy: string;
  /** Fil de discussion attache a l'evenement. */
  comments?: EventComment[];
}

export interface AppData {
  categories: Category[];
  dishes: Dish[];
  ingredients: Ingredient[];
  weekPlan: WeekPlan;
  shoppingList: ShoppingItem[];
  shoppingListGenerated: boolean;
  events: CalendarEvent[];
}
