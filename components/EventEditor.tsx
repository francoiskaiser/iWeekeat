import React, { useEffect, useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativePicker } from '@/components/NativePicker';
import { TimePicker } from '@/components/TimePicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CalendarEvent, Recurrence } from '@/types';
import { parseDateKey } from '@/utils/calendar';

const RECURRENCE_OPTIONS = [
  { label: 'Jamais', value: 'none' },
  { label: 'Chaque semaine', value: 'weekly' },
  { label: 'Chaque mois', value: 'monthly' },
  { label: 'Chaque annee', value: 'yearly' },
];

const REMINDER_OPTIONS = [
  { label: 'Aucun rappel', value: '' },
  { label: "A l'heure de l'evenement", value: '0' },
  { label: '15 minutes avant', value: '15' },
  { label: '1 heure avant', value: '60' },
  { label: 'La veille', value: '1440' },
];

interface Props {
  visible: boolean;
  dateKey: string;
  /** Evenement en cours de modification, ou null pour une creation. */
  event: CalendarEvent | null;
  members: Record<string, string>;
  currentUid: string;
  onClose: () => void;
  onSave: (values: Omit<CalendarEvent, 'id'>) => void;
  onDelete: () => void;
  onDeleteOccurrence: () => void;
}

export function EventEditor({
  visible, dateKey, event, members, currentUid, onClose, onSave, onDelete, onDeleteOccurrence,
}: Props) {
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const inputBg = isDarkMode ? '#0f172a' : '#fff';

  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reinitialise le formulaire a chaque ouverture.
  useEffect(() => {
    if (!visible) return;
    setTitle(event?.title ?? '');
    setAllDay(event ? event.allDay : true);
    setStart(event?.startTime ?? '');
    setEnd(event?.endTime ?? '');
    setNote(event?.note ?? '');
    setAssignedTo(event?.assignedTo ?? []);
    setRecurrence(event?.recurrence ?? 'none');
    setReminder(
      event?.reminderMinutes === null || event?.reminderMinutes === undefined
        ? ''
        : String(event.reminderMinutes),
    );
    setError(null);
  }, [visible, event]);

  const toggleMember = (uid: string) => {
    setAssignedTo((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  };

  const dayLabel = parseDateKey(dateKey).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Donnez un titre a l’evenement.');
      return;
    }

    let startTime: string | undefined;
    let endTime: string | undefined;

    if (!allDay) {
      if (!start) {
        setError('Choisissez une heure de debut.');
        return;
      }
      startTime = start;

      if (end) {
        if (end <= start) {
          setError('L’heure de fin doit suivre celle de debut.');
          return;
        }
        endTime = end;
      }
    }

    onSave({
      title: trimmedTitle,
      date: event?.date ?? dateKey,
      allDay,
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      assignedTo,
      recurrence,
      ...(event?.excludedDates ? { excludedDates: event.excludedDates } : {}),
      reminderMinutes: reminder === '' ? null : Number(reminder),
      createdBy: event?.createdBy ?? currentUid,
    });
  };

  const memberEntries = Object.entries(members);
  const isRecurring = (event?.recurrence ?? 'none') !== 'none';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{dayLabel}</Text>
              <Text style={[styles.title, { color: text }]}>
                {event ? 'Modifier' : 'Nouvel evenement'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={32} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >

            <Text style={[styles.label, { color: text }]}>Titre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
              placeholder="Ex : Rendez-vous dentiste"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <View style={[styles.switchRow, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.switchLabel, { color: text }]}>Journee entiere</Text>
              <Switch value={allDay} onValueChange={setAllDay} />
            </View>

            {!allDay && (
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <TimePicker label="Debut" value={start} onChange={setStart} placeholder="19:30" />
                </View>
                <View style={{ flex: 1 }}>
                  <TimePicker label="Fin" value={end} onChange={setEnd} placeholder="Optionnel" clearable />
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: text }]}>Concerne</Text>
            <View style={styles.chips}>
              <TouchableOpacity
                style={[styles.chip, { borderColor: border, backgroundColor: card },
                  assignedTo.length === 0 && styles.chipActive]}
                onPress={() => setAssignedTo([])}
              >
                <Text style={[styles.chipText, { color: assignedTo.length === 0 ? '#fff' : subText }]}>
                  Tout le foyer
                </Text>
              </TouchableOpacity>
              {memberEntries.map(([uid, name]) => {
                const active = assignedTo.includes(uid);
                return (
                  <TouchableOpacity
                    key={uid}
                    style={[styles.chip, { borderColor: border, backgroundColor: card }, active && styles.chipActive]}
                    onPress={() => toggleMember(uid)}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : subText }]}>
                      {uid === currentUid ? `${name} (moi)` : name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.pickerBlock}>
              <NativePicker
                label="Repeter"
                selectedValue={recurrence}
                onValueChange={(v) => setRecurrence(v as Recurrence)}
                options={RECURRENCE_OPTIONS}
              />
              <NativePicker
                label="Rappel"
                selectedValue={reminder}
                onValueChange={setReminder}
                options={REMINDER_OPTIONS}
                placeholder="Aucun rappel"
              />
            </View>

            <Text style={[styles.label, { color: text }]}>Note (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.noteInput, { backgroundColor: inputBg, borderColor: border, color: text }]}
              placeholder="Adresse, precisions..."
              placeholderTextColor="#94a3b8"
              multiline
              value={note}
              onChangeText={setNote}
            />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={submit}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>

            {event && (
              <>
                {isRecurring && (
                  <TouchableOpacity style={styles.deleteGhost} onPress={onDeleteOccurrence}>
                    <Ionicons name="calendar-clear-outline" size={18} color="#ef4444" />
                    <Text style={styles.deleteGhostText}>Supprimer cette occurrence seulement</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteGhost} onPress={onDelete}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={styles.deleteGhostText}>
                    {isRecurring ? 'Supprimer toute la serie' : "Supprimer l'evenement"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  eyebrow: { fontSize: 13, color: '#FF7A41', fontWeight: '700', textTransform: 'capitalize' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  scroll: { paddingHorizontal: 22, paddingBottom: 220 },

  label: { fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 16, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, height: 52, fontSize: 16 },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  noteInput: { height: 90, paddingTop: 14, textAlignVertical: 'top' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 18 },
  switchLabel: { fontSize: 15, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipActive: { backgroundColor: '#FF7A41', borderColor: '#FF7A41' },
  chipText: { fontSize: 14, fontWeight: '700' },

  pickerBlock: { marginTop: 22 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 19, fontWeight: '600' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, marginTop: 26 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  deleteGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca' },
  deleteGhostText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
