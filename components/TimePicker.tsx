import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** Creneaux courants, pour eviter de faire defiler dans la majorite des cas. */
const PRESETS = ['08:00', '12:00', '12:30', '18:00', '19:00', '19:30', '20:00', '20:30'];

const ROW_HEIGHT = 48;
const pad = (n: number) => String(n).padStart(2, '0');

function split(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map(Number);
  if (Number.isFinite(h) && Number.isFinite(m)) return { h, m };
  return { h: 19, m: 0 };
}

interface Props {
  label: string;
  /** "HH:MM", ou chaine vide si non renseigne. */
  value: string;
  placeholder?: string;
  /** Affiche un bouton pour revenir a "non renseigne". */
  clearable?: boolean;
  onChange: (value: string) => void;
}

export function TimePicker({ label, value, placeholder = 'Choisir', clearable, onChange }: Props) {
  const { isDarkMode, text, subText, card, border } = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => split(value || '19:00'));

  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  const triggerBg = isDarkMode ? '#0f172a' : '#fff';

  useEffect(() => {
    if (!open) return;
    const next = split(value || '19:00');
    setDraft(next);
    // Amene la valeur courante sous les yeux plutot qu'en haut de liste.
    requestAnimationFrame(() => {
      hourRef.current?.scrollTo({ y: next.h * ROW_HEIGHT, animated: false });
      minuteRef.current?.scrollTo({ y: (MINUTES.indexOf(next.m) < 0 ? 0 : MINUTES.indexOf(next.m)) * ROW_HEIGHT, animated: false });
    });
  }, [open, value]);

  const confirm = (h: number, m: number) => {
    onChange(`${pad(h)}:${pad(m)}`);
    setOpen(false);
  };

  return (
    <View>
      <Text style={[styles.label, { color: text }]}>{label}</Text>

      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: triggerBg, borderColor: border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={19} color="#94a3b8" />
        <Text style={[styles.triggerText, { color: value ? text : '#94a3b8' }]}>
          {value || placeholder}
        </Text>
        {clearable && value ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close-circle" size={19} color="#cbd5e1" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />

          <View style={[styles.sheet, { backgroundColor: card }]}>
            <View style={[styles.grip, { backgroundColor: border }]} />
            <Text style={[styles.sheetTitle, { color: text }]}>{label}</Text>

            <View style={styles.presets}>
              {PRESETS.map((preset) => {
                const active = preset === value;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.preset, { borderColor: border }, active && styles.presetActive]}
                    onPress={() => { const { h, m } = split(preset); confirm(h, m); }}
                  >
                    <Text style={[styles.presetText, { color: active ? '#fff' : subText }]}>{preset}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={[styles.columnLabel, { color: subText }]}>Heure</Text>
                <ScrollView
                  ref={hourRef}
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {HOURS.map((h) => {
                    const active = h === draft.h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.cell, active && styles.cellActive]}
                        onPress={() => setDraft((d) => ({ ...d, h }))}
                      >
                        <Text style={[styles.cellText, { color: active ? '#fff' : text }]}>{pad(h)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.column}>
                <Text style={[styles.columnLabel, { color: subText }]}>Minutes</Text>
                <ScrollView
                  ref={minuteRef}
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) => {
                    const active = m === draft.m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.cell, active && styles.cellActive]}
                        onPress={() => setDraft((d) => ({ ...d, m }))}
                      >
                        <Text style={[styles.cellText, { color: active ? '#fff' : text }]}>{pad(m)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={() => confirm(draft.h, draft.m)}>
              <Text style={styles.confirmText}>Valider {pad(draft.h)}:{pad(draft.m)}</Text>
            </TouchableOpacity>

            <SafeAreaView edges={['bottom']} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', marginBottom: 7, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  triggerText: { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grip: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 19, fontWeight: '800', marginBottom: 14 },

  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  preset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  presetActive: { backgroundColor: '#FF7A41', borderColor: '#FF7A41' },
  presetText: { fontSize: 14, fontWeight: '800' },

  columns: { flexDirection: 'row', gap: 14 },
  column: { flex: 1 },
  columnLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
  columnScroll: { height: ROW_HEIGHT * 4 },
  cell: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cellActive: { backgroundColor: '#FF7A41' },
  cellText: { fontSize: 20, fontWeight: '700' },

  confirmBtn: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
