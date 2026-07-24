import { useMemo, useState, useRef } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { NativePicker, NativePickerRef } from "@/components/NativePicker";
import { DAYS } from "@/constants";
import { useApp } from "@/context/AppContext";
import { DayKey } from "@/types";
import { useTheme } from '@/context/ThemeContext';
import { buildWeekMenuText, shareText } from "@/utils/share";

const CATEGORY_COLORS: Record<string, string> = {
  "default": "#FF7A41", "viande": "#FF7A41", "végétarien": "#10B981", "poisson": "#0EA5E9",
};
const CATEGORY_ICONS: Record<string, any> = {
  "default": "restaurant-outline", "viande": "restaurant-outline", "végétarien": "leaf-outline", "poisson": "water-outline",
};

export default function PlannerScreen() {
  const { isDarkMode } = useTheme();

  const bgColor = isDarkMode ? '#1e293b' : '#FFFBF5';
  const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
  const cardBgColor = isDarkMode ? '#334155' : '#fff';
  const subTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#475569' : '#f1f5f9';
  const trackColor = isDarkMode ? '#475569' : '#f1f5f9';
  const dashBg = isDarkMode ? '#33415555' : 'rgba(255,255,255,0.4)';
  const dashBorder = isDarkMode ? '#475569' : '#e2d9cf';

  const { data, setDayPlan, resetWeekPlan, randomizeWeek } = useApp();
  const [expandedDay, setExpandedDay] = useState<DayKey | null>(null);
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [draftDishId, setDraftDishId] = useState("");
  const dishPickerRef = useRef<NativePickerRef>(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: "", message: "", icon: "alert-circle-outline", confirmText: "Confirmer", confirmColor: "#FF7A41", onConfirm: () => {},
  });
  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, visible: false }));

  // --- Dates de la semaine (base lundi) & jour courant ---
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - mondayOffset);
  const dateForIndex = (i: number) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d.getDate(); };
  const todayKey: DayKey = DAYS[mondayOffset].key;

  const categoryOptions = useMemo(() => data.categories.map((c) => ({ label: c.name, value: c.id })), [data.categories]);
  const draftDishes = useMemo(() => data.dishes.filter((d) => d.categoryId === draftCategoryId), [data.dishes, draftCategoryId]);
  const dishOptions = useMemo(() => draftDishes.map((d) => ({ label: d.name, value: d.id })), [draftDishes]);
  const plannedCount = useMemo(() => Object.values(data.weekPlan).filter(Boolean).length, [data.weekPlan]);
  const progressPct = Math.round((plannedCount / 7) * 100);

  const openDay = (day: DayKey) => {
    const existing = data.weekPlan[day];
    if (expandedDay === day) { setExpandedDay(null); return; }
    setExpandedDay(day);
    setDraftCategoryId(existing?.categoryId ?? "");
    setDraftDishId(existing?.dishId ?? "");
  };
  const handleCategoryChange = (categoryId: string) => {
    setDraftCategoryId(categoryId); setDraftDishId("");
    setTimeout(() => { dishPickerRef.current?.open(); }, 150);
  };
  const validateDay = () => {
    if (!expandedDay || !draftCategoryId || !draftDishId) { Alert.alert("Sélection incomplète", "Choisissez une catégorie et un plat."); return; }
    setDayPlan(expandedDay, { categoryId: draftCategoryId, dishId: draftDishId });
    setExpandedDay(null);
  };
  const clearDay = () => {
    if (!expandedDay) return;
    setDayPlan(expandedDay, null); setDraftCategoryId(""); setDraftDishId(""); setExpandedDay(null);
  };
  const handleShare = () => {
    if (plannedCount === 0) { Alert.alert("Semaine vide", "Planifiez au moins un repas avant de partager le menu."); return; }
    shareText(buildWeekMenuText(data));
  };
  const handleRandomize = () => {
    if (data.dishes.length === 0) { Alert.alert("Pas de plats", "Ajoutez d'abord quelques plats dans le Garde-manger !"); return; }
    setConfirmModal({ visible: true, title: "Menu Aléatoire", message: "Voulez-vous remplir automatiquement la semaine avec des plats choisis au hasard ?", icon: "dice", confirmText: "Générer", confirmColor: "#FF7A41", onConfirm: () => { randomizeWeek(); closeConfirmModal(); } });
  };
  const handleReset = () => {
    setConfirmModal({ visible: true, title: "Réinitialiser", message: "Voulez-vous vraiment effacer tous les repas planifiés pour cette semaine ?", icon: "trash-outline", confirmText: "Tout effacer", confirmColor: "#ef4444", onConfirm: () => { resetWeekPlan(); closeConfirmModal(); } });
  };

  const getDayDisplayInfo = (day: DayKey) => {
    const plan = data.weekPlan[day];
    if (!plan) return { meal: null as string | null, catName: null as string | null, color: "#cbd5e1" };
    const category = data.categories.find((c) => c.id === plan.categoryId);
    const dish = data.dishes.find((d) => d.id === plan.dishId);
    const catNameLower = category?.name?.toLowerCase() || "default";
    let color = CATEGORY_COLORS["default"];
    if (catNameLower.includes("viande")) color = CATEGORY_COLORS["viande"];
    if (catNameLower.includes("végé") || catNameLower.includes("vege")) color = CATEGORY_COLORS["végétarien"];
    if (catNameLower.includes("poisson")) color = CATEGORY_COLORS["poisson"];
    return { meal: dish?.name ?? "Plat inconnu", catName: category?.name ?? null, color };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Ta semaine</Text>
          <Text style={[styles.title, { color: textColor }]}>Semainier</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.diceBadge} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.diceBadge} onPress={handleRandomize} activeOpacity={0.8}>
            <Ionicons name="dice" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

        {/* PROGRESSION SEMAINE */}
        <View style={[styles.progressCard, { backgroundColor: cardBgColor }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressTitle, { color: textColor }]}>{plannedCount} jours sur 7</Text>
            <Text style={styles.progressHint}>{plannedCount >= 7 ? "Complet 🎉" : `${7 - plannedCount} à compléter`}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {DAYS.map(({ key, label, short }, index) => {
          const info = getDayDisplayInfo(key);
          const isExpanded = expandedDay === key;
          const isPlanned = !!data.weekPlan[key];
          const isToday = key === todayKey;

          return (
            <View key={key} style={styles.cardWrapper}>
              {isPlanned ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openDay(key)}
                  style={[styles.dayCard, { backgroundColor: cardBgColor, borderColor: isToday ? '#FF7A41' : borderColor, borderWidth: isToday ? 2 : 1 },
                    isToday && styles.dayCardToday, isExpanded && styles.cardExpandedActive]}
                >
                  <View style={[styles.dateBadge, { backgroundColor: isToday ? '#FF7A4115' : (isDarkMode ? '#1e293b' : '#f8fafc') }]}>
                    <Text style={[styles.dateShort, { color: isToday ? '#FF7A41' : '#94a3b8' }]}>{short.toUpperCase()}</Text>
                    <Text style={[styles.dateNum, { color: isToday ? '#FF7A41' : subTextColor }]}>{dateForIndex(index)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.dayMetaRow}>
                      <View style={[styles.dot, { backgroundColor: info.color }]} />
                      <Text style={[styles.dayMeta, { color: isToday ? '#FF7A41' : subTextColor }]}>{isToday ? "AUJOURD'HUI" : (info.catName ?? label)}</Text>
                    </View>
                    <Text style={[styles.mealName, { color: textColor }]}>{info.meal}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isToday ? '#FF7A41' : '#cbd5e1'} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity activeOpacity={0.7} onPress={() => openDay(key)}
                  style={[styles.emptyCard, { backgroundColor: dashBg, borderColor: isToday ? '#FF7A41' : dashBorder }, isExpanded && styles.cardExpandedActive]}>
                  <View style={[styles.dateBadge, { backgroundColor: cardBgColor, borderWidth: 1, borderColor }]}>
                    <Text style={[styles.dateShort, { color: '#94a3b8' }]}>{short.toUpperCase()}</Text>
                    <Text style={[styles.dateNum, { color: '#94a3b8' }]}>{dateForIndex(index)}</Text>
                  </View>
                  <Text style={styles.emptyText}>Ajouter un repas</Text>
                  <View style={styles.addBtn}><Ionicons name="add" size={20} color="#fff" /></View>
                </TouchableOpacity>
              )}

              {isExpanded && (
                <View style={[styles.editorContainer, { backgroundColor: cardBgColor, borderColor: isToday ? '#FF7A41' : borderColor }]}>
                  <NativePicker label="Catégorie" selectedValue={draftCategoryId} onValueChange={handleCategoryChange} options={categoryOptions} placeholder="Choisir une catégorie" />
                  <NativePicker ref={dishPickerRef} label="Plat" selectedValue={draftDishId} onValueChange={setDraftDishId} options={dishOptions} placeholder={draftCategoryId ? "Choisir un plat" : "Sélectionnez d'abord une catégorie"} enabled={!!draftCategoryId && dishOptions.length > 0} />
                  <View style={styles.editorActions}>
                    <TouchableOpacity style={styles.btnValidate} onPress={validateDay}>
                      <Text style={styles.btnValidateText}>Valider</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnClear} onPress={clearDay}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {plannedCount > 0 && (
          <TouchableOpacity style={[styles.resetButton, { backgroundColor: cardBgColor }]} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={20} color="#ef4444" />
            <Text style={styles.resetButtonText}>Réinitialiser la semaine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
  diceBadge: { backgroundColor: '#FF7A41', padding: 11, borderRadius: 15, elevation: 4, shadowColor: '#FF7A41', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 110 },

  progressCard: { borderRadius: 18, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 15, fontWeight: '800' },
  progressHint: { fontSize: 13, fontWeight: '700', color: '#FF7A41' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF7A41', borderRadius: 4 },

  cardWrapper: { marginBottom: 12 },
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  dayCardToday: { shadowColor: '#FF7A41', shadowOpacity: 0.18, shadowRadius: 14, elevation: 5 },
  cardExpandedActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 14, borderWidth: 2, borderStyle: 'dashed' },
  dateBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateShort: { fontSize: 9, fontWeight: '800' },
  dateNum: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  dayMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dayMeta: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  mealName: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  emptyText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF7A41', alignItems: 'center', justifyContent: 'center' },

  editorContainer: { padding: 18, paddingTop: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1, borderTopWidth: 0, marginTop: -2 },
  editorActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10 },
  btnValidate: { flex: 1, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnValidateText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnClear: { backgroundColor: '#fef2f2', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  resetButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, marginTop: 6, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: '#fecaca' },
  resetButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

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
