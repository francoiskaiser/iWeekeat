import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRecipes } from '@/context/RecipesContext';
import { RECIPE_CATEGORIES } from '@/constants/recipes';
import type { Recipe, RecipeCategory } from '@/types';
import type { RecipeDraft } from '@/utils/recipes';
import { CommunityRules } from './CommunityRules';
import { PRIMARY, SUCCESS, DANGER } from '@/constants/theme';

const MAX_INGREDIENTS = 40;
const MAX_STEPS = 20;

interface Props {
  visible: boolean;
  /** Valeurs de depart : recette a modifier, ou plat du foyer a partager. */
  initial: RecipeDraft | null;
  /** Identifiant de la recette modifiee ; absent pour une publication. */
  editingId?: string;
  onClose: () => void;
  onSaved: (recipe: Recipe | null) => void;
}

type IngredientRow = { key: string; quantity: string; name: string };
type StepRow = { key: string; text: string };

let rowCounter = 0;
const rowKey = () => `row-${rowCounter++}`;

const EMPTY: RecipeDraft = { title: '', category: 'classiques', servings: 4, minutes: 30, ingredients: [], steps: [] };

export function RecipeEditor({ visible, initial, editingId, onClose, onSaved }: Props) {
  const { accent } = useThemeColors();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const inputBg = isDarkMode ? '#0f172a' : '#fff';
  const { rulesAccepted, acceptRules, publish, edit } = useRecipes();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('classiques');
  const [servings, setServings] = useState(4);
  const [minutes, setMinutes] = useState('30');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Reinitialise le formulaire a chaque ouverture.
  useEffect(() => {
    if (!visible) return;
    const start = initial ?? EMPTY;
    setTitle(start.title);
    setCategory(start.category);
    setServings(start.servings);
    setMinutes(String(start.minutes));
    const ing = start.ingredients.map((i) => ({ key: rowKey(), quantity: i.quantity ?? '', name: i.name }));
    setIngredients(ing.length ? ing : [{ key: rowKey(), quantity: '', name: '' }]);
    const st = start.steps.map((s) => ({ key: rowKey(), text: s }));
    setSteps(st.length ? st : [{ key: rowKey(), text: '' }]);
    setError(null);
    setSaving(false);
  }, [visible, initial]);

  const buildDraft = (): RecipeDraft | string => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) return 'Donne un nom à la recette.';
    if (cleanTitle.length > 80) return 'Le nom est trop long (80 caractères maximum).';

    const mins = parseInt(minutes, 10);
    if (!Number.isFinite(mins) || mins < 1 || mins > 720) return 'Indique un temps entre 1 et 720 minutes.';

    const ing = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() || undefined }));
    if (!ing.length) return 'Ajoute au moins un ingrédient.';

    const st = steps.map((s) => s.text.trim()).filter(Boolean);
    if (!st.length) return 'Décris au moins une étape.';

    return { title: cleanTitle, category, servings, minutes: mins, ingredients: ing, steps: st };
  };

  // `rulesJustAccepted` : appele juste apres l'acceptation de la charte, quand
  // l'etat `rulesAccepted` de ce rendu n'est pas encore a jour.
  const save = async (rulesJustAccepted = false) => {
    const draft = buildDraft();
    if (typeof draft === 'string') {
      setError(draft);
      return;
    }
    // Premiere publication : la charte doit d'abord etre acceptee.
    if (!editingId && !rulesAccepted && !rulesJustAccepted) {
      setShowRules(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await edit(editingId, draft);
        onSaved(null);
      } else {
        onSaved(await publish(draft));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onAcceptRules = async () => {
    await acceptRules();
    setShowRules(false);
    // On enchaine directement sur la publication demandee.
    await save(true);
  };

  const updateIngredient = (key: string, field: 'quantity' | 'name', value: string) =>
    setIngredients((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  const removeIngredient = (key: string) =>
    setIngredients((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : [{ key: rowKey(), quantity: '', name: '' }]));
  const updateStep = (key: string, value: string) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, text: value } : s)));
  const removeStep = (key: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : [{ key: rowKey(), text: '' }]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: accent }]}>{editingId ? 'Ma recette' : 'Communauté'}</Text>
              <Text style={[styles.title, { color: text }]}>{editingId ? 'Modifier la recette' : 'Proposer une recette'}</Text>
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
            <Text style={[styles.label, { color: text }]}>Nom de la recette</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
              placeholder="Ex : Gratin de chou-fleur"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <Text style={[styles.label, { color: text }]}>Catégorie</Text>
            <View style={styles.chips}>
              {RECIPE_CATEGORIES.map((c) => {
                const active = c.id === category;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[styles.chip, { borderColor: border, backgroundColor: card }, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : text }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: text }]}>Personnes</Text>
                <View style={[styles.stepper, { backgroundColor: inputBg, borderColor: border }]}>
                  <TouchableOpacity onPress={() => setServings((s) => Math.max(1, s - 1))} style={styles.stepperBtn}>
                    <Ionicons name="remove" size={20} color={accent} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: text }]}>{servings}</Text>
                  <TouchableOpacity onPress={() => setServings((s) => Math.min(20, s + 1))} style={styles.stepperBtn}>
                    <Ionicons name="add" size={20} color={accent} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: text }]}>Temps total (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
                  keyboardType="number-pad"
                  value={minutes}
                  onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, ''))}
                  maxLength={3}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: text }]}>Ingrédients</Text>
            <Text style={[styles.help, { color: subText }]}>
              Un produit par ligne, au singulier (« Oignon », quantité « 2 ») : la liste de courses regroupe mieux les doublons.
            </Text>
            {ingredients.map((row) => (
              <View key={row.key} style={styles.ingRow}>
                <TextInput
                  style={[styles.input, styles.qtyInput, { backgroundColor: inputBg, borderColor: border, color: text }]}
                  placeholder="200 g"
                  placeholderTextColor="#94a3b8"
                  value={row.quantity}
                  onChangeText={(v) => updateIngredient(row.key, 'quantity', v)}
                  maxLength={20}
                />
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: border, color: text }]}
                  placeholder="Ingrédient"
                  placeholderTextColor="#94a3b8"
                  value={row.name}
                  onChangeText={(v) => updateIngredient(row.key, 'name', v)}
                  maxLength={60}
                />
                <TouchableOpacity onPress={() => removeIngredient(row.key)} style={styles.removeBtn} accessibilityLabel="Retirer l'ingrédient">
                  <Ionicons name="close" size={18} color={DANGER} />
                </TouchableOpacity>
              </View>
            ))}
            {ingredients.length < MAX_INGREDIENTS && (
              <TouchableOpacity
                style={[styles.addLine, { borderColor: border }]}
                onPress={() => setIngredients((prev) => [...prev, { key: rowKey(), quantity: '', name: '' }])}
              >
                <Ionicons name="add" size={18} color={accent} />
                <Text style={[styles.addLineText, { color: accent }]}>Ajouter un ingrédient</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: text }]}>Étapes</Text>
            {steps.map((row, index) => (
              <View key={row.key} style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                <TextInput
                  style={[styles.input, styles.stepInput, { backgroundColor: inputBg, borderColor: border, color: text }]}
                  placeholder="Décris cette étape"
                  placeholderTextColor="#94a3b8"
                  value={row.text}
                  onChangeText={(v) => updateStep(row.key, v)}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity onPress={() => removeStep(row.key)} style={styles.removeBtn} accessibilityLabel="Retirer l'étape">
                  <Ionicons name="close" size={18} color={DANGER} />
                </TouchableOpacity>
              </View>
            ))}
            {steps.length < MAX_STEPS && (
              <TouchableOpacity
                style={[styles.addLine, { borderColor: border }]}
                onPress={() => setSteps((prev) => [...prev, { key: rowKey(), text: '' }])}
              >
                <Ionicons name="add" size={18} color={accent} />
                <Text style={[styles.addLineText, { color: accent }]}>Ajouter une étape</Text>
              </TouchableOpacity>
            )}

            {!editingId && (
              <View style={[styles.notice, { backgroundColor: card, borderColor: border }]}>
                <Ionicons name="globe-outline" size={18} color={subText} />
                <Text style={[styles.noticeText, { color: subText }]}>
                  Ta recette sera visible par tous les utilisateurs d&apos;iWeekeat, avec ton prénom. Ils pourront la noter et l&apos;ajouter à leurs plats.
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={() => save()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name={editingId ? 'save-outline' : 'paper-plane'} size={20} color="#fff" />}
              <Text style={styles.saveBtnText}>{editingId ? 'Enregistrer' : 'Publier la recette'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CommunityRules visible={showRules} onClose={() => setShowRules(false)} onAccept={onAcceptRules} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  eyebrow: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  scroll: { paddingHorizontal: 22, paddingBottom: 220 },

  label: { fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 18, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  help: { fontSize: 12, lineHeight: 17, marginBottom: 10, marginHorizontal: 4 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 50, fontSize: 15 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 14, fontWeight: '700' },

  twoCols: { flexDirection: 'row', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, height: 50, paddingHorizontal: 6 },
  stepperBtn: { padding: 8 },
  stepperValue: { fontSize: 17, fontWeight: '800' },

  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qtyInput: { width: 92 },
  removeBtn: { backgroundColor: '#fef2f2', padding: 8, borderRadius: 10 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepInput: { flex: 1, height: undefined, minHeight: 50, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },

  addLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 12, marginTop: 2 },
  addLineText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 22 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 19, fontWeight: '600' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SUCCESS, borderRadius: 16, paddingVertical: 16, marginTop: 22 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
