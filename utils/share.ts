// utils/share.ts
// Partage de la liste de courses et du menu de la semaine
// via la feuille de partage native (WhatsApp, SMS, Mail, etc.)

import { Share } from "react-native";

type ShoppingItem = { id: string; name: string; checked: boolean; isExtra?: boolean };
type DayPlan = { categoryId: string; dishId: string };

type ShareData = {
  weekPlan: Record<string, DayPlan[]>;
  dishes: { id: string; categoryId: string; name: string }[];
  categories: { id: string; name: string }[];
  shoppingList: ShoppingItem[];
};

type ShareWeekDay = { dateKey: string; label: string };

// WhatsApp interprète *texte* en gras et _texte_ en italique
export function buildWeekMenuText(weekDays: ShareWeekDay[], data: ShareData): string {
  const lines: string[] = ["🍽️ *Menu de la semaine*", ""];
  for (const { dateKey, label } of weekDays) {
    const names = (data.weekPlan[dateKey] ?? [])
      .map((plan) => data.dishes.find((d) => d.id === plan.dishId)?.name)
      .filter((n): n is string => Boolean(n));
    lines.push(`${label} : ${names.length ? names.join(" + ") : "—"}`);
  }
  lines.push("", "_Envoyé depuis MealHelper_");
  return lines.join("\n");
}

export function buildShoppingListText(data: ShareData): string {
  const food = data.shoppingList.filter((i) => !i.isExtra);
  const extras = data.shoppingList.filter((i) => i.isExtra);
  const lines: string[] = ["🛒 *Liste de courses*", ""];

  const section = (title: string, items: ShoppingItem[]) => {
    if (items.length === 0) return;
    lines.push(title);
    for (const it of items) lines.push(`${it.checked ? "✅" : "▢"} ${it.name}`);
    lines.push("");
  };

  section("🍽️ Côté Cuisine", food);
  section("🧴 Côté Maison", extras);

  if (food.length === 0 && extras.length === 0) {
    lines.push("(liste vide — génère-la d'abord depuis tes repas)", "");
  }
  lines.push("_Envoyé depuis MealHelper_");
  return lines.join("\n");
}

export async function shareText(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    // partage annulé par l'utilisateur — rien à faire
  }
}
