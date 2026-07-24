import { DayKey } from "@/types";

export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "monday", label: "Lundi", short: "Lun" },
  { key: "tuesday", label: "Mardi", short: "Mar" },
  { key: "wednesday", label: "Mercredi", short: "Mer" },
  { key: "thursday", label: "Jeudi", short: "Jeu" },
  { key: "friday", label: "Vendredi", short: "Ven" },
  { key: "saturday", label: "Samedi", short: "Sam" },
  { key: "sunday", label: "Dimanche", short: "Dim" },
];

export const STORAGE_KEY = "@mealhelper/data";

export const COLORS = {
  primary: "#1a7f5a",
  primaryDark: "#146648",
  primaryLight: "#e8f5ef",
  background: "#f5f7f6",
  surface: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  warning: "#f59e0b",
  success: "#16a34a",
};
