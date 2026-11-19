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
  WEEKDAY_INITIALS, buildMonthMatrix, concerns, eventsOnDate, formatEventTime, monthLabel, parseDateKey,
} from '@/utils/calendar';
import { HOUSEHOLD_COLOR } from '@/utils/groups';
import { PRIMARY, SUCCESS } from '@/constants/theme';

/** Nombre de libelles affichables dans une case du mois avant resume. */
const MAX_CHIPS_PER_DAY = 2;

export default function CalendarScreen() {
  const { accent, successText } = useThemeColors();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const { data, addEvent, updateEvent, deleteEvent, deleteOccurrence, addComment, deleteComment } = useApp();
  const { members, memberColors, user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);
  const [editorOpen, setEditorOpen] = useState(false);
  // On ne memorise que l'identifiant : l'evenement lui-meme est relu dans les
  // donnees a chaque rendu, sinon un commentaire ajoute n'apparaitrait qu'a la
  // reouverture de la fiche.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissionRefused, setPermissionRefused] = useState(false);
  // null = tout le foyer ; sinon on ne montre que ce qui concerne ce membre.
  const [filterUid, setFilterUid] = useState<string | null>(null);

  const allEvents = useMemo(() => data.events ?? [], [data.events]);
  // Un evenement de tout le foyer concerne aussi la personne filtree.
  const events = useMemo(
    () => (filterUid ? allEvents.filter((e) => concerns(e, filterUid)) : allEvents),
    [allEvents, filterUid],
  );

  const editing = useMemo(
    () => allEvents.find((e) => e.id === editingId) ?? null,
    [allEvents, editingId],
  );

  /** Couleur d'un evenement : celle du membre concerne, ou celle du foyer. */
  const colorOf = (event: CalendarEvent): string => {
    const [first, ...rest] = event.assignedTo ?? [];
    if (!first || rest.length) return HOUSEHOLD_COLOR;
    return memberColors[first] ?? HOUSEHOLD_COLOR;
  };
  const weeks = useMemo(() => buildMonthMatrix(cursor.year, cursor.month), [cursor]);
  const dayEvents = useMemo(() => eventsOnDate(events, selected), [events, selected]);

  const mealNameFor = (dateKey: string): string => {
    const first = (data.weekPlan[dateKey] ?? [])[0];
    if (!first) return '';
    return data.dishes.find((d) => d.id === first.dishId)?.name ?? 'Repas';
  };

  const selectedDishes = useMemo(
    () => (data.weekPlan[selected] ?? [])
      .map((plan) => data.dishes.find((d) => d.id === plan.dishId)?.name)
      .filter((n): n is string => Boolean(n)),
    [data.weekPlan, data.dishes, selected],
  );

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

  const openNew = () => { setEditingId(null); setEditorOpen(true); };
  const openExisting = (event: CalendarEvent) => { setEditingId(event.id); setEditorOpen(true); };

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
          <Text style={styles.eyebrow}>Ton foyer</Text>
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

        {/* FILTRE PAR PERSONNE */}
        {Object.keys(members).length > 1 && (
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, { borderColor: border, backgroundColor: card },
                filterUid === null && { backgroundColor: HOUSEHOLD_COLOR, borderColor: HOUSEHOLD_COLOR }]}
              onPress={() => setFilterUid(null)}
            >
              <Text style={[styles.filterText, { color: filterUid === null ? '#fff' : subText }]}>
                Tout le foyer
              </Text>
            </TouchableOpacity>
            {Object.entries(members).map(([uid, name]) => {
              const active = filterUid === uid;
              const c = memberColors[uid] ?? HOUSEHOLD_COLOR;
              return (
                <TouchableOpacity
                  key={uid}
                  style={[styles.filterChip, styles.filterChipDotted, { borderColor: border, backgroundColor: card },
                    active && { backgroundColor: c, borderColor: c }]}
                  onPress={() => setFilterUid(active ? null : uid)}
                >
                  <View style={[styles.filterDot, { backgroundColor: active ? '#fff' : c }]} />
                  <Text style={[styles.filterText, { color: active ? '#fff' : subText }]}>
                    {uid === user?.uid ? 'Moi' : name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* NAVIGATION MOIS */}
        <View style={[styles.monthNav, { backgroundColor: card, borderColor: border }]}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={22} color={accent} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: text }]}>{monthLabel(cursor.year, cursor.month)}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={22} color={accent} />
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
                const dayItems = eventsOnDate(events, key);
                const mealName = mealNameFor(key);

                // La case est etroite : deux libelles au maximum, le reste
                // est resume par un compteur.
                const chips = dayItems.slice(0, MAX_CHIPS_PER_DAY);
                const showMeal = chips.length < MAX_CHIPS_PER_DAY && Boolean(mealName);
                const overflow = dayItems.length - chips.length + (mealName && !showMeal ? 1 : 0);

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
                    <View style={styles.chips}>
                      {chips.map((event, i) => {
                        const c = colorOf(event);
                        return (
                          <View key={key + '-e-' + i} style={[styles.chipEvent, { backgroundColor: c + '22' }]}>
                            <Text style={[styles.chipEventText, { color: c }]} numberOfLines={1}>
                              {event.title}
                            </Text>
                          </View>
                        );
                      })}
                      {showMeal && (
                        <View style={styles.chipMeal}>
                          <Text style={[styles.chipMealText, { color: successText }]} numberOfLines={1}>
                            {mealName}
                          </Text>
                        </View>
                      )}
                      {overflow > 0 && (
                        <Text style={[styles.chipMore, { color: subText }]}>+{overflow}</Text>
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
            <View style={[styles.legendSwatch, { backgroundColor: HOUSEHOLD_COLOR + '22', borderColor: HOUSEHOLD_COLOR }]} />
            <Text style={[styles.legendText, { color: subText }]}>Tout le foyer</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#10B98115', borderColor: SUCCESS }]} />
            <Text style={[styles.legendText, { color: subText }]}>Repas prévu</Text>
          </View>
        </View>

        {/* JOUR SELECTIONNE */}
        <Text style={[styles.dayHeading, { color: text }]}>{selectedLabel}</Text>

        {selectedDishes.length > 0 && (
          <View style={[styles.mealCard, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="restaurant" size={18} color={successText} />
            <Text style={[styles.mealText, { color: text }]}>{selectedDishes.join(' + ')}</Text>
            <Text style={[styles.mealHint, { color: subText }]}>au menu</Text>
          </View>
        )}

        {dayEvents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={38} color={subText} />
            <Text style={[styles.emptyText, { color: subText }]}>Aucun événement ce jour-là.</Text>
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
                <View style={[styles.eventTime, { backgroundColor: colorOf(event) + '22' }]}>
                  <Text style={[styles.eventTimeText, { color: colorOf(event) }]}>
                    {event.allDay || !event.startTime ? 'Jour' : event.startTime}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: text }]}>{event.title}</Text>
                  <Text style={[styles.eventMeta, { color: subText }]}>
                    {formatEventTime(event)}
                    {who ? ` · ${who}` : ''}
                    {event.recurrence !== 'none' ? ' · répété' : ''}
                  </Text>
                  {event.location ? (
                    <View style={styles.eventLocation}>
                      <Ionicons name="location-outline" size={12} color={subText} />
                      <Text style={[styles.eventNote, { color: subText }]} numberOfLines={1}>{event.location}</Text>
                    </View>
                  ) : null}
                  {event.note ? (
                    <Text style={[styles.eventNote, { color: subText }]} numberOfLines={2}>{event.note}</Text>
                  ) : null}
                  {(event.comments ?? []).length > 0 && (
                    <View style={styles.eventLocation}>
                      <Ionicons name="chatbubble-outline" size={12} color={subText} />
                      <Text style={[styles.eventNote, { color: subText }]}>
                        {(event.comments ?? []).length} message(s)
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter un événement</Text>
        </TouchableOpacity>
      </ScrollView>

      <EventEditor
        visible={editorOpen}
        dateKey={editing?.date ?? selected}
        event={editing}
        members={members}
        memberColors={memberColors}
        currentUid={user?.uid ?? ''}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onDelete={() => { if (editing) deleteEvent(editing.id); setEditorOpen(false); }}
        onDeleteOccurrence={() => { if (editing) deleteOccurrence(editing.id, selected); setEditorOpen(false); }}
        onAddComment={(txt) => { if (editing && user) addComment(editing.id, user.uid, txt); }}
        onDeleteComment={(commentId) => { if (editing) deleteComment(editing.id, commentId); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  eyebrow: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  todayBtn: { backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  todayBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },

  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  warnText: { flex: 1, color: '#b45309', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  filterChipDotted: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '800' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 12 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 17, fontWeight: '800' },

  grid: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 10 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 70 },
  dayInner: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 2, borderColor: PRIMARY },
  daySelected: { backgroundColor: PRIMARY },
  dayNum: { fontSize: 13, fontWeight: '700' },
  dayNumToday: { color: PRIMARY, fontWeight: '900' },
  dayNumSelected: { color: '#fff', fontWeight: '900' },

  chips: { width: '100%', paddingHorizontal: 1, gap: 2, marginTop: 2 },
  chipEvent: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  chipEventText: { fontSize: 9, fontWeight: '800' },
  chipMeal: { backgroundColor: '#10B98115', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  chipMealText: { color: SUCCESS, fontSize: 9, fontWeight: '800' },
  chipMore: { fontSize: 9, fontWeight: '800', textAlign: 'center' },

  legend: { flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 9, borderRadius: 3, borderWidth: 1 },
  legendText: { fontSize: 12, fontWeight: '600' },

  dayHeading: { fontSize: 19, fontWeight: '900', marginTop: 26, marginBottom: 12, textTransform: 'capitalize' },

  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 10 },
  mealText: { flex: 1, fontSize: 15, fontWeight: '800' },
  mealHint: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 26, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  eventTime: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  eventTimeText: { fontSize: 13, fontWeight: '800' },
  eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  eventTitle: { fontSize: 16, fontWeight: '800' },
  eventMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  eventNote: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 15, marginTop: 16, elevation: 4, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
