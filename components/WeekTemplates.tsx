import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { palette } from '@/constants/theme';

export interface TemplateWeek {
  /** "Cette semaine", "Semaine prochaine" */
  label: string;
  /** Les 7 jours de la semaine, du lundi au dimanche. */
  dateKeys: string[];
  /** Jours que l'on peut encore remplir (pas les jours passés). */
  allowedDateKeys: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  weeks: TemplateWeek[];
}

/**
 * Semaines types : enregistrer une semaine qui revient souvent (« semaine
 * rentrée », « semaine chargée ») et la réappliquer en un geste.
 */
export function WeekTemplates({ visible, onClose, weeks }: Props) {
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const c = palette(isDarkMode);
  const { data, saveWeekTemplate, applyWeekTemplate, deleteWeekTemplate } = useApp();
  const [name, setName] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);

  const templates = data.weekTemplates ?? [];
  const source = weeks[sourceIndex] ?? weeks[0];
  const sourceMeals = source ? source.dateKeys.reduce((n, k) => n + (data.weekPlan[k]?.length ?? 0), 0) : 0;

  const save = () => {
    if (!source) return;
    if (!name.trim()) { Alert.alert('Nom manquant', 'Donne un nom à cette semaine type.'); return; }
    if (sourceMeals === 0) { Alert.alert('Semaine vide', `${source.label} ne contient encore aucun repas.`); return; }
    saveWeekTemplate(name, source.dateKeys);
    setName('');
  };

  const apply = (templateId: string, week: TemplateWeek) => {
    applyWeekTemplate(templateId, week.dateKeys, week.allowedDateKeys);
    onClose();
  };

  const confirmDelete = (templateId: string, templateName: string) => {
    Alert.alert(`Supprimer « ${templateName} » ?`, 'Les repas déjà planifiés ne changent pas.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteWeekTemplate(templateId) },
    ]);
  };

  const dishName = (dishId: string) => data.dishes.find((d) => d.id === dishId)?.name;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: c.accentText }]}>Semainier</Text>
              <Text style={[styles.title, { color: text }]}>Semaines types</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close-circle" size={32} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.section, { color: text }]}>Enregistrer une semaine</Text>
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              {weeks.length > 1 && (
                <View style={styles.chips}>
                  {weeks.map((w, i) => {
                    const active = i === sourceIndex;
                    return (
                      <TouchableOpacity
                        key={w.label}
                        onPress={() => setSourceIndex(i)}
                        style={[styles.chip, { borderColor: border }, active && { backgroundColor: c.primary, borderColor: c.primary }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.chipText, { color: active ? '#fff' : text }]}>{w.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={[styles.help, { color: subText }]}>
                {source ? `${source.label} : ${sourceMeals} repas` : ''}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text, backgroundColor: isDarkMode ? '#0f172a' : '#fff' }]}
                placeholder="Nom, ex. : Semaine chargée"
                placeholderTextColor={c.placeholder}
                value={name}
                onChangeText={setName}
                maxLength={40}
                onSubmitEditing={save}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: c.primary }]} onPress={save}>
                <Ionicons name="bookmark" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.section, { color: text }]}>Mes semaines types</Text>
            {templates.length === 0 ? (
              <Text style={[styles.empty, { color: subText }]}>
                Aucune semaine type pour l&apos;instant. Planifie une semaine qui te plaît, puis enregistre-la ici.
              </Text>
            ) : templates.map((t) => {
              const count = t.days.reduce((n, d) => n + d.length, 0);
              const preview = t.days.flat().map((m) => dishName(m.dishId)).filter(Boolean).slice(0, 3).join(', ');
              return (
                <View key={t.id} style={[styles.card, { backgroundColor: card, borderColor: border }]}>
                  <View style={styles.tplHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tplName, { color: text }]}>{t.name}</Text>
                      <Text style={[styles.help, { color: subText }]} numberOfLines={1}>
                        {count} repas{preview ? ` · ${preview}…` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(t.id, t.name)}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Supprimer ${t.name}`}
                    >
                      <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.applyRow}>
                    {weeks.map((w) => (
                      <TouchableOpacity
                        key={w.label}
                        style={[styles.applyBtn, { borderColor: c.primary }]}
                        onPress={() => apply(t.id, w)}
                      >
                        <Text style={[styles.applyText, { color: c.accentText }]}>Appliquer à {w.label.toLowerCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
            <Text style={[styles.note, { color: subText }]}>
              Appliquer une semaine type remplace les repas des jours qu&apos;elle contient. Les jours passés ne sont pas modifiés.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  eyebrow: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingBottom: 80 },
  section: { fontSize: 13, fontWeight: '800', marginTop: 20, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
  help: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 50, fontSize: 15 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, minHeight: 48, marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, marginHorizontal: 4 },
  tplHeader: { flexDirection: 'row', alignItems: 'center' },
  tplName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  applyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  applyBtn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  applyText: { fontSize: 13, fontWeight: '800' },
  note: { fontSize: 12, lineHeight: 17, marginTop: 10, marginHorizontal: 4 },
});
