import { CalendarEvent } from '@/types';
import { addDays, getWeekdayIndex, startOfDay, toDateKey } from './date';

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Libelles de colonnes, semaine demarrant le lundi. */
export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Parse une cle "YYYY-MM-DD" en date locale.
 * `new Date("2026-07-27")` serait interprete en UTC et pourrait decaler
 * d'un jour selon le fuseau : on construit donc la date explicitement.
 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** L'evenement a-t-il une occurrence ce jour-la ? */
export function occursOn(event: CalendarEvent, dateKey: string): boolean {
  if (event.excludedDates?.includes(dateKey)) return false;
  if (dateKey < event.date) return false;
  if (event.recurrence === 'none') return dateKey === event.date;

  const day = parseDateKey(dateKey);
  const start = parseDateKey(event.date);

  switch (event.recurrence) {
    case 'weekly':
      return day.getDay() === start.getDay();
    case 'monthly':
      // Un evenement du 31 n'apparait pas les mois plus courts, ce qui est
      // le comportement attendu (pas de report au 30 ou au 1er).
      return day.getDate() === start.getDate();
    case 'yearly':
      return day.getDate() === start.getDate() && day.getMonth() === start.getMonth();
    default:
      return false;
  }
}

function minutesOf(event: CalendarEvent): number {
  if (event.allDay || !event.startTime) return -1; // journee entiere en tete
  const [h, m] = event.startTime.split(':').map(Number);
  return h * 60 + m;
}

/** Evenements d'un jour donne, journees entieres d'abord puis par heure. */
export function eventsOnDate(events: CalendarEvent[], dateKey: string): CalendarEvent[] {
  return events
    .filter((e) => occursOn(e, dateKey))
    .sort((a, b) => minutesOf(a) - minutesOf(b) || a.title.localeCompare(b.title, 'fr'));
}

/**
 * Grille du mois, semaines completes demarrant le lundi.
 * Les cases de debut et de fin peuvent appartenir aux mois voisins.
 */
export function buildMonthMatrix(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  let cursor = addDays(startOfDay(firstOfMonth), -getWeekdayIndex(firstOfMonth));
  const weeks: Date[][] = [];

  while (weeks.length === 0 || cursor <= lastOfMonth) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/** "14:30 - 15:30", "14:30" ou "Journée entière". */
export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay || !event.startTime) return 'Journée entière';
  return event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime;
}

/**
 * Prochaine occurrence a partir d'un instant donne, dans une fenetre limitee.
 * Sert a planifier les rappels locaux.
 */
export function nextOccurrences(
  event: CalendarEvent,
  from: Date,
  daysAhead: number,
): Date[] {
  const out: Date[] = [];
  const [h, m] = event.allDay || !event.startTime
    ? [9, 0] // un rappel de journee entiere se cale sur le matin
    : event.startTime.split(':').map(Number);

  for (let i = 0; i <= daysAhead; i++) {
    const day = addDays(startOfDay(from), i);
    if (!occursOn(event, toDateKey(day))) continue;
    const at = new Date(day);
    at.setHours(h, m, 0, 0);
    if (at > from) out.push(at);
  }
  return out;
}

/** L'evenement concerne-t-il cet utilisateur ? (liste vide = tout le foyer) */
export function concerns(event: CalendarEvent, uid: string): boolean {
  return !event.assignedTo?.length || event.assignedTo.includes(uid);
}
