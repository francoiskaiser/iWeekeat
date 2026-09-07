import React, { useEffect, useRef, useState } from 'react';
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
  memberColors: Record<string, string>;
  currentUid: string;
  onClose: () => void;
  onSave: (values: Omit<CalendarEvent, 'id'>) => void;
  onDelete: () => void;
  onDeleteOccurrence: () => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function EventEditor({
  visible, dateKey, event, members, memberColors, currentUid,
  onClose, onSave, onDelete, onDeleteOccurrence, onAddComment, onDeleteComment,
}: Props) {
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const inputBg = isDarkMode ? '#0f172a' : '#fff';

  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [draftComment, setDraftComment] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);

  // L'evenement est relu en continu depuis les donnees du foyer : sans cette
  // reference, le moindre commentaire recu reinitialiserait le formulaire et
  // effacerait une saisie en cours.
  const eventRef = useRef(event);
  eventRef.current = event;
  const eventId = event?.id ?? null;

  // Reinitialise le formulaire a l'ouverture, ou en changeant d'evenement.
  useEffect(() => {
    if (!visible) return;
    const event = eventRef.current;
    setTitle(event?.title ?? '');
    setAllDay(event ? event.allDay : true);
    setStart(event?.startTime ?? '');
    setEnd(event?.endTime ?? '');
    setLocation(event?.location ?? '');
    setNote(event?.note ?? '');
    setDraftComment('');
    setAssignedTo(event?.assignedTo ?? []);
    setRecurrence(event?.recurrence ?? 'none');
    setReminder(
      event?.reminderMinutes === null || event?.reminderMinutes === undefined
        ? ''
        : String(event.reminderMinutes),
    );
    setError(null);
  }, [visible, eventId]);

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
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      assignedTo,
      recurrence,
      ...(event?.excludedDates ? { excludedDates: event.excludedDates } : {}),
      reminderMinutes: reminder === '' ? null : Number(reminder),
      createdBy: event?.createdBy ?? currentUid,
      // Le fil de discussion vit en dehors du formulaire : on le reconduit tel
      // quel pour ne pas l'effacer en enregistrant une modification.
      ...(event?.comments ? { comments: event.comments } : {}),
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

            <Text style={[styles.label, { color: text }]}>Lieu (optionnel)</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: border }]}>
              <Ionicons name="location-outline" size={19} color="#94a3b8" />
              <TextInput
                style={[styles.inputRowText, { color: text }]}
                placeholder="Ex : Cabinet du Dr Martin, Nancy"
                placeholderTextColor="#94a3b8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

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
                    style={[
                      styles.chip, styles.chipWithDot, { borderColor: border, backgroundColor: card },
                      active && { backgroundColor: memberColors[uid] ?? '#FF7A41', borderColor: memberColors[uid] ?? '#FF7A41' },
                    ]}
                    onPress={() => toggleMember(uid)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : (memberColors[uid] ?? '#94a3b8') }]} />
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
              <View style={styles.commentsBlock}>
                <Text style={[styles.label, { color: text }]}>Discussion</Text>

                {(event.comments ?? []).length === 0 ? (
                  <Text style={[styles.noComments, { color: subText }]}>
                    Aucun message. Utilisez ce fil pour vous mettre d&apos;accord sur cet evenement.
                  </Text>
                ) : (
                  (event.comments ?? []).map((comment) => {
                    const mine = comment.uid === currentUid;
                    const author = mine ? 'Moi' : (members[comment.uid] ?? 'Membre');
                    const color = memberColors[comment.uid] ?? '#94a3b8';
                    return (
                      <View key={comment.id} style={[styles.comment, { backgroundColor: card, borderColor: border }]}>
                        <View style={[styles.commentBar, { backgroundColor: color }]} />
                        <View style={{ flex: 1 }}>
                          <View style={styles.commentHead}>
                            <Text style={[styles.commentAuthor, { color }]}>{author}</Text>
                            <Text style={[styles.commentDate, { color: subText }]}>
                              {new Date(comment.at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.commentText, { color: text }]}>{comment.text}</Text>
                        </View>
                        {mine && (
                          <TouchableOpacity
                            onPress={() => onDeleteComment(comment.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="close" size={16} color="#cbd5e1" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}

                <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: border }]}>
                  <TextInput
                    style={[styles.inputRowText, { color: text }]}
                    placeholder="Ecrire un message..."
                    placeholderTextColor="#94a3b8"
                    value={draftComment}
                    onChangeText={setDraftComment}
                    onSubmitEditing={() => { onAddComment(draftComment); setDraftComment(''); }}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !draftComment.trim() && { opacity: 0.4 }]}
                    disabled={!draftComment.trim()}
                    onPress={() => { onAddComment(draftComment); setDraftComment(''); }}
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

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

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputRowText: { flex: 1, fontSize: 16 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipWithDot: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipDot: { width: 9, height: 9, borderRadius: 5 },

  commentsBlock: { marginTop: 6 },
  noComments: { fontSize: 13, lineHeight: 19, marginBottom: 12, marginHorizontal: 4 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  commentBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: '800' },
  commentDate: { fontSize: 11, fontWeight: '600' },
  commentText: { fontSize: 14, lineHeight: 19 },
  sendBtn: { backgroundColor: '#FF7A41', width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
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
