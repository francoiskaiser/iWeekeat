import { useMemo, useState, useRef } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { NativePicker, NativePickerRef, PickerOption } from "@/components/NativePicker";
import { useApp } from "@/context/AppContext";
import { DayPlan } from "@/types";
import { useThemeColors } from '@/hooks/useThemeColors';
import { buildWeekMenuText, shareText } from "@/utils/share";
import { WeekDay, addDays, buildWeek, getMonday, getWeekdayIndex, startOfDay, toDateKey } from "@/utils/date";
import { BRAND, PRIMARY, SUCCESS, DANGER } from '@/constants/theme';
import { WeekTemplates, TemplateWeek } from "@/components/WeekTemplates";

const CATEGORY_COLORS: Record<string, string> = {
  "default": PRIMARY, "viande": PRIMARY, "végétarien": SUCCESS, "poisson": "#0EA5E9",
};

type DayInfo = { meal: string | null; catName: string | null; color: string };

export default function PlannerScreen() {
  const { accent, successText } = useThemeColors();
  const {
    isDarkMode,
    background: bgColor,
    text: textColor,
    card: cardBgColor,
    subText: subTextColor,
    border: borderColor,
    track: trackColor,
  } = useThemeColors();

  const dashBg = isDarkMode ? '#33415555' : 'rgba(255,255,255,0.4)';
  const dashBorder = isDarkMode ? '#475569' : '#e2d9cf';

  const { data, addDayPlan, removeDayPlan, clearDay, resetWeekPlan, randomizeWeek } = useApp();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  // Index du repas en cours de modification ; null = ajout d'un nouveau repas.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [draftDishId, setDraftDishId] = useState("");
  const dishPickerRef = useRef<NativePickerRef>(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: "", message: "", icon: "alert-circle-outline", confirmText: "Confirmer", confirmColor: PRIMARY, onConfirm: () => {},
  });
  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, visible: false }));
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // --- Semaine en cours (jours restants uniquement) & semaine suivante (à partir de vendredi) ---
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const todayStart = startOfDay(today);
  const todayWeekdayIndex = getWeekdayIndex(today); // Lundi = 0 ... Dimanche = 6

  const thisWeek = useMemo(() => buildWeek(getMonday(today)), [today]);
  const visibleThisWeek = useMemo(
    () => thisWeek.filter((d) => d.date.getTime() >= todayStart.getTime()),
    [thisWeek, todayStart]
  );
  const showNextWeek = todayWeekdayIndex >= 4; // Vendredi, samedi, dimanche
  const nextWeek = useMemo(() => buildWeek(addDays(getMonday(today), 7)), [today]);

  // Semaines proposees dans les semaines types : celle en cours (jours a venir
  // seulement) et, en fin de semaine, la suivante.
  const templateWeeks = useMemo<TemplateWeek[]>(() => {
    const weeks: TemplateWeek[] = [{
      label: 'Cette semaine',
      dateKeys: thisWeek.map((d) => d.dateKey),
      allowedDateKeys: visibleThisWeek.map((d) => d.dateKey),
    }];
    if (showNextWeek) {
      weeks.push({ label: 'Semaine prochaine', dateKeys: nextWeek.map((d) => d.dateKey), allowedDateKeys: nextWeek.map((d) => d.dateKey) });
    }
    return weeks;
  }, [thisWeek, visibleThisWeek, nextWeek, showNextWeek]);

  const categoryOptions = useMemo(() => data.categories.map((c) => ({ label: c.name, value: c.id })), [data.categories]);
  const draftDishes = useMemo(() => data.dishes.filter((d) => d.categoryId === draftCategoryId), [data.dishes, draftCategoryId]);
  const dishOptions = useMemo(() => draftDishes.map((d) => ({ label: d.name, value: d.id })), [draftDishes]);

  const plannedThisWeek = useMemo(
    () => visibleThisWeek.filter((d) => (data.weekPlan[d.dateKey] ?? []).length > 0).length,
    [visibleThisWeek, data.weekPlan]
  );
  const plannedNextWeek = useMemo(
    () => nextWeek.filter((d) => (data.weekPlan[d.dateKey] ?? []).length > 0).length,
    [nextWeek, data.weekPlan]
  );

  const closeEditor = () => {
    setExpandedDay(null); setEditingIndex(null);
    setDraftCategoryId(""); setDraftDishId("");
  };

  /** Ouvre l'editeur pour ajouter un repas a ce jour. */
  const openDayForAdd = (dateKey: string) => {
    if (expandedDay === dateKey && editingIndex === null) { closeEditor(); return; }
    setExpandedDay(dateKey);
    setEditingIndex(null);
    setDraftCategoryId(""); setDraftDishId("");
  };

  /** Ouvre l'editeur sur un repas deja present, pour le remplacer. */
  const openDayForEdit = (dateKey: string, index: number) => {
    if (expandedDay === dateKey && editingIndex === index) { closeEditor(); return; }
    const existing = (data.weekPlan[dateKey] ?? [])[index];
    setExpandedDay(dateKey);
    setEditingIndex(index);
    setDraftCategoryId(existing?.categoryId ?? "");
    setDraftDishId(existing?.dishId ?? "");
  };

  const handleCategoryChange = (categoryId: string) => {
    setDraftCategoryId(categoryId); setDraftDishId("");
    setTimeout(() => { dishPickerRef.current?.open(); }, 150);
  };

  const validateDay = () => {
    if (!expandedDay || !draftCategoryId || !draftDishId) { Alert.alert("Sélection incomplète", "Choisis une catégorie et un plat."); return; }
    addDayPlan(expandedDay, { categoryId: draftCategoryId, dishId: draftDishId }, editingIndex ?? undefined);
    closeEditor();
  };

  const removeCurrentMeal = () => {
    if (!expandedDay) return;
    if (editingIndex !== null) removeDayPlan(expandedDay, editingIndex);
    else clearDay(expandedDay);
    closeEditor();
  };

  const handleShare = () => {
    if (plannedThisWeek === 0) { Alert.alert("Semaine vide", "Planifie au moins un repas avant de partager le menu."); return; }
    shareText(buildWeekMenuText(thisWeek, data));
  };
  const handleRandomize = (days: WeekDay[]) => {
    if (data.dishes.length === 0) { Alert.alert("Pas de plats", "Ajoute d'abord quelques plats dans l'onglet Plats."); return; }
    setConfirmModal({ visible: true, title: "Menu aléatoire", message: "Remplir automatiquement ces jours avec des plats choisis au hasard ?", icon: "dice", confirmText: "Générer", confirmColor: PRIMARY, onConfirm: () => { randomizeWeek(days.map((d) => d.dateKey)); closeConfirmModal(); } });
  };
  const handleReset = (days: WeekDay[]) => {
    setConfirmModal({ visible: true, title: "Réinitialiser", message: "Effacer les repas planifiés sur cette période ?", icon: "trash-outline", confirmText: "Tout effacer", confirmColor: DANGER, onConfirm: () => { resetWeekPlan(days.map((d) => d.dateKey)); closeConfirmModal(); } });
  };

  const getMealInfo = (plan: DayPlan): DayInfo => {
    const category = data.categories.find((c) => c.id === plan.categoryId);
    const dish = data.dishes.find((d) => d.id === plan.dishId);
    const catNameLower = category?.name?.toLowerCase() || "default";
    let color = CATEGORY_COLORS["default"];
    if (catNameLower.includes("viande")) color = CATEGORY_COLORS["viande"];
    if (catNameLower.includes("végé") || catNameLower.includes("vege")) color = CATEGORY_COLORS["végétarien"];
    if (catNameLower.includes("poisson")) color = CATEGORY_COLORS["poisson"];
    return { meal: dish?.name ?? "Plat inconnu", catName: category?.name ?? null, color };
  };

  const renderDayCard = (day: WeekDay) => {
    const meals = data.weekPlan[day.dateKey] ?? [];
    const isToday = day.dateKey === todayKey;
    const isExpanded = expandedDay === day.dateKey;
    const accent = isToday ? PRIMARY : borderColor;

    return (
      <View key={day.dateKey} style={styles.cardWrapper}>
        {meals.length > 0 ? (
          <View
            style={[styles.dayCard, { backgroundColor: cardBgColor, borderColor: accent, borderWidth: isToday ? 2 : 1 },
              isToday && styles.dayCardToday, isExpanded && styles.cardExpandedActive]}
          >
            <View style={styles.dayCardHead}>
              <View style={[styles.dateBadge, { backgroundColor: isToday ? BRAND + '15' : (isDarkMode ? '#1e293b' : '#f8fafc') }]}>
                <Text style={[styles.dateShort, { color: isToday ? PRIMARY : '#94a3b8' }]}>{day.short.toUpperCase()}</Text>
                <Text style={[styles.dateNum, { color: isToday ? PRIMARY : subTextColor }]}>{day.date.getDate()}</Text>
              </View>
              <Text style={[styles.dayMeta, { color: isToday ? PRIMARY : subTextColor }]}>
                {isToday ? "AUJOURD'HUI" : day.label}
              </Text>
            </View>

            {meals.map((plan, index) => {
              const info = getMealInfo(plan);
              const isEditingThis = isExpanded && editingIndex === index;
              return (
                <TouchableOpacity
                  key={`${day.dateKey}-${index}`}
                  activeOpacity={0.7}
                  onPress={() => openDayForEdit(day.dateKey, index)}
                  style={[styles.mealRow, { borderTopColor: borderColor }, isEditingThis && styles.mealRowActive]}
                >
                  <View style={[styles.dot, { backgroundColor: info.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealName, { color: textColor }]}>{info.meal}</Text>
                    {info.catName && (
                      <Text style={[styles.mealCat, { color: subTextColor }]}>{info.catName}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.addMoreRow, { borderTopColor: borderColor }]}
              onPress={() => openDayForAdd(day.dateKey)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={successText} />
              <Text style={[styles.addMoreText, { color: successText }]}>Ajouter un autre repas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={() => openDayForAdd(day.dateKey)}
            style={[styles.emptyCard, { backgroundColor: dashBg, borderColor: isToday ? PRIMARY : dashBorder }, isExpanded && styles.cardExpandedActive]}>
            <View style={[styles.dateBadge, { backgroundColor: cardBgColor, borderWidth: 1, borderColor }]}>
              <Text style={[styles.dateShort, { color: '#94a3b8' }]}>{day.short.toUpperCase()}</Text>
              <Text style={[styles.dateNum, { color: '#94a3b8' }]}>{day.date.getDate()}</Text>
            </View>
            <Text style={styles.emptyText}>Ajouter un repas</Text>
            <View style={styles.addBtn}><Ionicons name="add" size={20} color="#fff" /></View>
          </TouchableOpacity>
        )}

        {isExpanded && (
          <View style={[styles.editorContainer, { backgroundColor: cardBgColor, borderColor: accent }]}>
            <NativePicker label="Catégorie" selectedValue={draftCategoryId} onValueChange={handleCategoryChange} options={categoryOptions as PickerOption[]} placeholder="Choisir une catégorie" />
            <NativePicker ref={dishPickerRef} label="Plat" selectedValue={draftDishId} onValueChange={setDraftDishId} options={dishOptions as PickerOption[]} placeholder={draftCategoryId ? "Choisir un plat" : "Sélectionne d'abord une catégorie"} enabled={!!draftCategoryId && dishOptions.length > 0} />
            <View style={styles.editorActions}>
              <TouchableOpacity style={styles.btnValidate} onPress={validateDay}>
                <Text style={styles.btnValidateText}>
                  {editingIndex !== null ? 'Remplacer' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
              {meals.length > 0 && (
                <TouchableOpacity style={styles.btnClear} onPress={removeCurrentMeal}>
                  <Ionicons name="trash-outline" size={20} color={DANGER} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Ta semaine</Text>
          <Text style={[styles.title, { color: textColor }]}>Semainier</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.diceBadge} onPress={() => setTemplatesOpen(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Semaines types">
            <Ionicons name="bookmarks-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.diceBadge} onPress={handleShare} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Partager le menu de la semaine">
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.diceBadge} onPress={() => handleRandomize(visibleThisWeek)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Menu aléatoire pour cette semaine">
            <Ionicons name="dice" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

        {/* PROGRESSION SEMAINE */}
        <View style={[styles.progressCard, { backgroundColor: cardBgColor }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressTitle, { color: textColor }]}>{plannedThisWeek} jour(s) sur {visibleThisWeek.length}</Text>
            <Text style={[styles.progressHint, { color: accent }]}>{plannedThisWeek >= visibleThisWeek.length ? "Complet" : `${visibleThisWeek.length - plannedThisWeek} à compléter`}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
            <View style={[styles.progressFill, { width: `${Math.round((plannedThisWeek / visibleThisWeek.length) * 100)}%` }]} />
          </View>
        </View>

        {visibleThisWeek.map((day) => renderDayCard(day))}

        {plannedThisWeek > 0 && (
          <TouchableOpacity style={[styles.resetButton, { backgroundColor: cardBgColor }]} onPress={() => handleReset(visibleThisWeek)}>
            <Ionicons name="refresh-outline" size={20} color={DANGER} />
            <Text style={styles.resetButtonText}>Réinitialiser cette semaine</Text>
          </TouchableOpacity>
        )}

        {showNextWeek && (
          <>
            <View style={styles.nextWeekHeader}>
              <View>
                <Text style={[styles.nextWeekTitle, { color: textColor }]}>Semaine prochaine</Text>
                <Text style={[styles.nextWeekSubtitle, { color: subTextColor }]}>Prépare déjà tes repas en avance</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.sectionDiceBadge} onPress={() => { if (plannedNextWeek === 0) { Alert.alert("Semaine vide", "Planifie au moins un repas avant de partager le menu."); return; } shareText(buildWeekMenuText(nextWeek, data)); }} activeOpacity={0.8}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.sectionDiceBadge} onPress={() => handleRandomize(nextWeek)} activeOpacity={0.8}>
                  <Ionicons name="dice" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {nextWeek.map((day) => renderDayCard(day))}

            {plannedNextWeek > 0 && (
              <TouchableOpacity style={[styles.resetButton, { backgroundColor: cardBgColor }]} onPress={() => handleReset(nextWeek)}>
                <Ionicons name="refresh-outline" size={20} color={DANGER} />
                <Text style={styles.resetButtonText}>Réinitialiser la semaine prochaine</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <WeekTemplates visible={templatesOpen} onClose={() => setTemplatesOpen(false)} weeks={templateWeeks} />

      <Modal visible={confirmModal.visible} transparent animationType="fade" onRequestClose={closeConfirmModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalAlertCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: confirmModal.confirmColor + '15' }]}>
              <Ionicons name={confirmModal.icon as any} size={40} color={confirmModal.confirmColor} />
            </View>
            <Text style={[styles.modalAlertTitle, { color: textColor }]}>{confirmModal.title}</Text>
            <Text style={[styles.modalAlertMessage, { color: subTextColor }]}>{confirmModal.message}</Text>
            <View style={styles.modalAlertActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]} onPress={closeConfirmModal} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: confirmModal.confirmColor }]} onPress={confirmModal.onConfirm} activeOpacity={0.7}>
                <Text style={styles.modalConfirmText}>{confirmModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  diceBadge: { backgroundColor: PRIMARY, padding: 11, borderRadius: 15, elevation: 4, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 110 },

  progressCard: { borderRadius: 18, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 15, fontWeight: '800' },
  progressHint: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 4 },

  cardWrapper: { marginBottom: 12 },
  dayCard: { borderRadius: 18, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  dayCardHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 10 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1 },
  mealRowActive: { opacity: 0.6 },
  mealCat: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  addMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderTopWidth: 1 },
  addMoreText: { color: SUCCESS, fontSize: 13, fontWeight: '700' },
  dayCardToday: { shadowColor: PRIMARY, shadowOpacity: 0.18, shadowRadius: 14, elevation: 5 },
  cardExpandedActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 14, borderWidth: 2, borderStyle: 'dashed' },
  dateBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateShort: { fontSize: 9, fontWeight: '800' },
  dateNum: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  dayMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dayMeta: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  mealName: { fontSize: 15, fontWeight: '800' },
  emptyText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },

  editorContainer: { padding: 18, paddingTop: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1, borderTopWidth: 0, marginTop: -2 },
  editorActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10 },
  btnValidate: { flex: 1, backgroundColor: SUCCESS, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnValidateText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnClear: { backgroundColor: '#fef2f2', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  resetButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, marginTop: 6, marginBottom: 6, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: '#fecaca' },
  resetButtonText: { color: DANGER, fontWeight: '600', fontSize: 15 },

  nextWeekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 14, paddingHorizontal: 2 },
  nextWeekTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  nextWeekSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  sectionDiceBadge: { backgroundColor: PRIMARY, padding: 9, borderRadius: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalAlertCard: { borderRadius: 28, padding: 25, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalAlertTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  modalAlertMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  modalAlertActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#64748b', fontSize: 16, fontWeight: '700' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
