import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventEditor } from '@/components/EventEditor';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CalendarEvent } from '@/types';
import { toDateKey } from '@/utils/date';
import { requestReminderPermission } from '@/utils/reminders';
import {
  WEEKDAY_INITIALS, buildMonthMatrix, eventsOnDate, formatEventTime, monthLabel, parseDateKey,
} from '@/utils/calendar';

export default function CalendarScreen() {
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const { data, addEvent, updateEvent, deleteEvent, deleteOccurrence } = useApp();
  const { members, user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [permissionRefused, setPermissionRefused] = useState(false);

  const events = useMemo(() => data.events ?? [], [data.events]);
  const weeks = useMemo(() => buildMonthMatrix(cursor.year, cursor.month), [cursor]);
  const dayEvents = useMemo(() => eventsOnDate(events, selected), [events, selected]);

  const selectedDish = useMemo(() => {
    const plan = data.weekPlan[selected];
    return plan ? data.dishes.find((d) => d.id === plan.dishId) ?? null : null;
  }, [data.weekPlan, data.dishes, selected]);

  const shiftMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const m = month + delta;
      if (m < 0) return { year: year - 1, month: 11 };
      if (m > 11) return { year: year + 1, month: 0 };
      return { year, month: m };
    });
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(todayKey);
  };

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openExisting = (event: CalendarEvent) => { setEditing(event); setEditorOpen(true); };

  const handleSave = (values: Omit<CalendarEvent, 'id'>) => {
    if (editing) updateEvent(editing.id, values);
    else addEvent(values);
    setEditorOpen(false);

    // On ne demande l'autorisation qu'au moment ou elle sert vraiment,
    // plutot qu'au premier lancement de l'app.
    if (values.reminderMinutes !== null && values.reminderMinutes !== undefined) {
      requestReminderPermission().then((granted) => {
        if (!granted) setPermissionRefused(true);
      });
    }
  };

  const whoLabel = (event: CalendarEvent): string | null => {
    if (!event.assignedTo?.length) return null;
    return event.assignedTo
      .map((uid) => (uid === user?.uid ? 'Moi' : members[uid] ?? 'Membre'))
      .join(', ');
  };

  const selectedLabel = parseDateKey(selected).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Votre foyer</Text>
          <Text style={[styles.title, { color: text }]}>Agenda</Text>
        </View>
        <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.8}>
          <Text style={styles.todayBtnText}>Aujourd&apos;hui</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {permissionRefused && (
          <View style={styles.warnBanner}>
            <Ionicons name="notifications-off-outline" size={18} color="#b45309" />
            <Text style={styles.warnText}>
              Les notifications sont bloquees : l&apos;evenement est bien enregistre,
              mais aucun rappel ne s&apos;affichera. Autorisez-les dans les reglages
              du telephone.
            </Text>
          </View>
        )}

        {/* NAVIGATION MOIS */}
        <View style={[styles.monthNav, { backgroundColor: card, borderColor: border }]}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={22} color="#FF7A41" />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: text }]}>{monthLabel(cursor.year, cursor.month)}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={22} color="#FF7A41" />
          </TouchableOpacity>
        </View>

        {/* GRILLE DU MOIS */}
        <View style={[styles.grid, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_INITIALS.map((d, i) => (
              <Text key={i} style={[styles.weekdayText, { color: subText }]}>{d}</Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const key = toDateKey(day);
                const inMonth = day.getMonth() === cursor.month;
                const isToday = key === todayKey;
                const isSelected = key === selected;
                const count = eventsOnDate(events, key).length;
                const hasMeal = Boolean(data.weekPlan[key]);

                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.dayCell}
                    onPress={() => setSelected(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.dayInner,
                      isToday && !isSelected && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}>
                      <Text style={[
                        styles.dayNum,
                        { color: inMonth ? text : (isDarkMode ? '#475569' : '#cbd5e1') },
                        isToday && !isSelected && styles.dayNumToday,
                        isSelected && styles.dayNumSelected,
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={styles.dots}>
                      {count > 0 && (
                        <View style={[styles.dot, { backgroundColor: isSelected ? '#FF7A41' : '#0EA5E9' }]} />
                      )}
                      {hasMeal && (
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#0EA5E9' }]} />
            <Text style={[styles.legendText, { color: subText }]}>Evenement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: subText }]}>Repas prevu</Text>
          </View>
        </View>

        {/* JOUR SELECTIONNE */}
        <Text style={[styles.dayHeading, { color: text }]}>{selectedLabel}</Text>

        {selectedDish && (
          <View style={[styles.mealCard, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="restaurant" size={18} color="#10B981" />
            <Text style={[styles.mealText, { color: text }]}>{selectedDish.name}</Text>
            <Text style={[styles.mealHint, { color: subText }]}>au menu</Text>
          </View>
        )}

        {dayEvents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={38} color={subText} />
            <Text style={[styles.emptyText, { color: subText }]}>Aucun evenement ce jour-la.</Text>
          </View>
        ) : (
          dayEvents.map((event) => {
            const who = whoLabel(event);
            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: card, borderColor: border }]}
                onPress={() => openExisting(event)}
                activeOpacity={0.7}
              >
                <View style={styles.eventTime}>
                  <Text style={styles.eventTimeText}>
                    {event.allDay || !event.startTime ? 'Jour' : event.startTime}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: text }]}>{event.title}</Text>
                  <Text style={[styles.eventMeta, { color: subText }]}>
                    {formatEventTime(event)}
                    {who ? ` · ${who}` : ''}
                    {event.recurrence !== 'none' ? ' · repete' : ''}
                  </Text>
                  {event.note ? (
                    <Text style={[styles.eventNote, { color: subText }]} numberOfLines={2}>{event.note}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter un evenement</Text>
        </TouchableOpacity>
      </ScrollView>

      <EventEditor
        visible={editorOpen}
        dateKey={editing?.date ?? selected}
        event={editing}
        members={members}
        currentUid={user?.uid ?? ''}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onDelete={() => { if (editing) deleteEvent(editing.id); setEditorOpen(false); }}
        onDeleteOccurrence={() => { if (editing) deleteOccurrence(editing.id, selected); setEditorOpen(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  eyebrow: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  todayBtn: { backgroundColor: '#FF7A41', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  todayBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },

  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  warnText: { flex: 1, color: '#b45309', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 12 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 17, fontWeight: '800' },

  grid: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 10 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayInner: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 2, borderColor: '#FF7A41' },
  daySelected: { backgroundColor: '#FF7A41' },
  dayNum: { fontSize: 14, fontWeight: '700' },
  dayNumToday: { color: '#FF7A41', fontWeight: '900' },
  dayNumSelected: { color: '#fff', fontWeight: '900' },
  dots: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },

  legend: { flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },

  dayHeading: { fontSize: 19, fontWeight: '900', marginTop: 26, marginBottom: 12, textTransform: 'capitalize' },

  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 10 },
  mealText: { flex: 1, fontSize: 15, fontWeight: '800' },
  mealHint: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 26, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  eventTime: { backgroundColor: '#0EA5E915', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  eventTimeText: { color: '#0EA5E9', fontSize: 13, fontWeight: '800' },
  eventTitle: { fontSize: 16, fontWeight: '800' },
  eventMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  eventNote: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#FF7A41', borderRadius: 16, paddingVertical: 15, marginTop: 16, elevation: 4, shadowColor: '#FF7A41', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
