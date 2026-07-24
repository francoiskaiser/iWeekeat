import { DAYS } from "@/constants";
import { DayKey } from "@/types";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Lundi = 0 ... Dimanche = 6
export function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function getMonday(date: Date): Date {
  return addDays(startOfDay(date), -getWeekdayIndex(date));
}

export interface WeekDay {
  date: Date;
  dateKey: string;
  dayKey: DayKey;
  label: string;
  short: string;
}

export function buildWeek(monday: Date): WeekDay[] {
  return DAYS.map((d, i) => {
    const date = addDays(monday, i);
    return { date, dateKey: toDateKey(date), dayKey: d.key, label: d.label, short: d.short };
  });
}

export function getCurrentWeekDateKeys(reference: Date = new Date()): string[] {
  return buildWeek(getMonday(reference)).map((d) => d.dateKey);
}
