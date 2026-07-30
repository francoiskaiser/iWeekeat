import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CalendarEvent } from '@/types';
import { concerns, formatEventTime, nextOccurrences } from './calendar';

// Les rappels sont purement locaux : chaque telephone planifie les siens a
// partir du calendrier deja synchronise. Pas de serveur, donc pas besoin du
// plan payant de Firebase.

/** Fenetre de planification. Au-dela, on replanifiera a la prochaine ouverture. */
const HORIZON_DAYS = 60;

/** Android impose un plafond de notifications planifiees ; on reste large dessous. */
const MAX_SCHEDULED = 60;

const supported = Platform.OS !== 'web';

let handlerInstalled = false;

function installHandler() {
  if (handlerInstalled || !supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerInstalled = true;
}

/** Demande l'autorisation si elle n'a pas deja ete accordee ou refusee. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  installHandler();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function bodyFor(event: CalendarEvent): string {
  const when = formatEventTime(event);
  return event.note ? `${when} — ${event.note}` : when;
}

/**
 * Reprogramme l'ensemble des rappels a partir des evenements du foyer.
 * On efface tout avant de replanifier : c'est plus simple et plus sur que
 * de tenter un diff, et le volume reste faible.
 */
export async function rescheduleReminders(
  events: CalendarEvent[],
  uid: string,
): Promise<number> {
  if (!supported) return 0;
  installHandler();

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const planned: { at: Date; event: CalendarEvent }[] = [];

  for (const event of events) {
    const minutes = event.reminderMinutes;
    if (minutes === null || minutes === undefined) continue;
    if (!concerns(event, uid)) continue;

    for (const occurrence of nextOccurrences(event, now, HORIZON_DAYS)) {
      const at = new Date(occurrence.getTime() - minutes * 60_000);
      if (at > now) planned.push({ at, event });
    }
  }

  planned.sort((a, b) => a.at.getTime() - b.at.getTime());

  const kept = planned.slice(0, MAX_SCHEDULED);
  for (const { at, event } of kept) {
    await Notifications.scheduleNotificationAsync({
      content: { title: event.title, body: bodyFor(event) },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });
  }

  return kept.length;
}

export async function cancelAllReminders(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
