import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { CleanAssistant } from "@/components/CleanAssistant";
import { useApp, CleanItem, ExtendedShoppingItem } from "@/context/AppContext";
import { useThemeColors } from '@/hooks/useThemeColors';
import { buildShoppingListText, shareText } from "@/utils/share";
import { getUpcomingDateKeys } from "@/utils/date";

export default function ShoppingScreen() {
  const {
    isDarkMode,
    background: bgColor,
    text: textColor,
    card: cardBgColor,
    subText: subTextColor,
    border: borderColor,
    track: trackColor,
  } = useThemeColors();

  const inputBgColor = isDarkMode ? '#0f172a' : '#f8fafc';
  const reserveBgColor = isDarkMode ? '#1e293b' : '#f8fafc';
  const tagBgColor = isDarkMode ? '#475569' : '#f1f5f9';
  const badgeBgColor = isDarkMode ? '#1e293b' : '#fff';

  const { data, generateList, toggleShoppingItem, removeShoppingItem, addExtraItem, deleteExtraByName, applyCleanResults, startCleanMode } = useApp();

  const [cleanVisible, setCleanVisible] = useState(false);
  const [cleanQueue, setCleanQueue] = useState<CleanItem[]>([]);
  const [cleanIndex, setCleanIndex] = useState(0);
  const [cleanRemaining, setCleanRemaining] = useState<CleanItem[]>([]);
  const [newExtraItem, setNewExtraItem] = useState("");
  const [showReserve, setShowReserve] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const upcomingKeys = useMemo(() => getUpcomingDateKeys(data.weekPlan), [data.weekPlan]);
  const plannedCount = useMemo(
    () => upcomingKeys.filter((k) => data.weekPlan[k]).length,
    [upcomingKeys, data.weekPlan]
  );

  const foodItems = data.shoppingList.filter((i) => !(i as ExtendedShoppingItem).isExtra);
  const foodTodo = foodItems.filter((i) => !i.checked);
  const foodDone = foodItems.filter((i) => i.checked);
  const activeExtraItems = data.shoppingList.filter((i) => (i as ExtendedShoppingItem).isExtra && !i.checked);

  const doneCount = foodDone.length;
  const totalCount = foodItems.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleShare = () => {
    if (data.shoppingList.length === 0) { Alert.alert("Liste vide", "Générez votre liste de courses avant de la partager."); return; }
    shareText(buildShoppingListText(data));
  };

  const reserveItems = useMemo(() => {
    const recurring = data.recurringExtras || [];
    return recurring.filter((name) => !data.shoppingList.some((item) => item.name.toLowerCase() === name.toLowerCase() && !item.checked));
  }, [data.recurringExtras, data.shoppingList]);

  const ingredientToDishesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const plannedDishIds = upcomingKeys.map((k) => data.weekPlan[k]).filter(Boolean).map((p) => p!.dishId);
    plannedDishIds.forEach((dishId) => {
      const dish = data.dishes.find((d) => d.id === dishId);
      if (!dish) return;
      data.ingredients.filter((i) => i.dishId === dishId).forEach((ing) => {
        const name = ing.name.toLowerCase().trim();
        if (!map[name]) map[name] = [];
        if (!map[name].includes(dish.name)) map[name].push(dish.name);
      });
    });
    return map;
  }, [upcomingKeys, data.weekPlan, data.dishes, data.ingredients]);

  const handleGenerate = () => {
    if (plannedCount === 0) { Alert.alert("Semaine vide", "Planifiez au moins un repas dans l'onglet Semainier avant de générer la liste."); return; }
    generateList();
  };
  const handleAddExtra = () => { if (newExtraItem.trim() === "") return; addExtraItem(newExtraItem); setNewExtraItem(""); };
  const startClean = () => {
    const items = startCleanMode(); if (items.length === 0) return;
    setCleanQueue(items); setCleanIndex(0); setCleanRemaining([]); setCleanVisible(true);
  };
  const finishClean = (remaining: CleanItem[]) => { applyCleanResults(remaining); setCleanVisible(false); setCleanQueue([]); setCleanIndex(0); setCleanRemaining([]); };
  const advanceClean = (keep: boolean) => {
    const current = cleanQueue[cleanIndex]; const nextRemaining = keep ? [...cleanRemaining, current] : cleanRemaining; const nextIndex = cleanIndex + 1;
    if (nextIndex >= cleanQueue.length) finishClean(nextRemaining); else { setCleanRemaining(nextRemaining); setCleanIndex(nextIndex); }
  };
  const cancelClean = () => {
    setCleanVisible(false); setCleanQueue([]); setCleanIndex(0); setCleanRemaining([]);
  };

  const showCleanBtn = data.shoppingListGenerated || data.shoppingList.length > 0 || (data.recurringExtras && data.recurringExtras.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>

        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Au supermarché</Text>
            <Text style={[styles.title, { color: textColor }]}>Courses</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.profileBadge, { backgroundColor: badgeBgColor }]} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={22} color="#FF7A41" />
            </TouchableOpacity>
            <View style={[styles.profileBadge, { backgroundColor: badgeBgColor }]}>
              <Ionicons name="basket-outline" size={22} color="#FF7A41" />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* PROGRESSION CADDIE */}
          {totalCount > 0 && (
            <View style={[styles.progressCard, { backgroundColor: cardBgColor }]}>
              <View style={styles.progressRow}>
                <Text style={[styles.progressTitle, { color: textColor }]}>{doneCount} sur {totalCount} dans le caddie</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
            </View>
          )}

          {/* ACTIONS COMPACTES */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Générer</Text>
            </TouchableOpacity>
            {showCleanBtn && (
              <TouchableOpacity style={[styles.cleanBtn, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: isDarkMode ? '#059669' : '#a7f3d0' }]} onPress={startClean}>
                <Ionicons name="scan-outline" size={18} color="#10B981" />
                <Text style={styles.cleanBtnText}>Placards</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CÔTÉ CUISINE — À PRENDRE */}
          {foodTodo.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>🍽️ Côté Cuisine</Text>
                <View style={styles.counterBadge}><Text style={styles.counterText}>{foodTodo.length} à prendre</Text></View>
              </View>
              <View style={[styles.listCard, { backgroundColor: cardBgColor, borderColor }]}>
                {foodTodo.map((item, index) => {
                  const isLast = index === foodTodo.length - 1;
                  const itemDishes = ingredientToDishesMap[item.name.toLowerCase().trim()] || [];
                  return (
                    <TouchableOpacity key={item.id} style={[styles.listItem, { borderBottomColor: borderColor }, isLast && { borderBottomWidth: 0 }]} onPress={() => toggleShoppingItem(item.id)} activeOpacity={0.6}>
                      <View style={styles.checkbox} />
                      <View style={styles.itemTextContent}>
                        <Text style={[styles.itemName, { color: textColor }]}>{item.name}</Text>
                        {itemDishes.length > 0 && (
                          <View style={styles.dishTagsContainer}>
                            {itemDishes.map((dishName, idx) => (
                              <View key={idx} style={[styles.dishTag, { backgroundColor: tagBgColor }]}>
                                <Text style={[styles.dishTagText, { color: subTextColor }]} numberOfLines={1}>{dishName}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* CÔTÉ CUISINE — DÉJÀ PRIS (repliable) */}
          {foodDone.length > 0 && (
            <>
              <TouchableOpacity style={styles.doneHeader} onPress={() => setShowDone(!showDone)} activeOpacity={0.7}>
                <Text style={[styles.doneHeaderText, { color: subTextColor }]}>✓ Déjà pris ({foodDone.length})</Text>
                <Ionicons name={showDone ? "chevron-up" : "chevron-down"} size={16} color={subTextColor} />
              </TouchableOpacity>
              {showDone && (
                <View style={[styles.listCard, { backgroundColor: cardBgColor, borderColor, opacity: 0.75 }]}>
                  {foodDone.map((item, index) => (
                    <TouchableOpacity key={item.id} style={[styles.listItem, { borderBottomColor: borderColor }, index === foodDone.length - 1 && { borderBottomWidth: 0 }]} onPress={() => toggleShoppingItem(item.id)} activeOpacity={0.6}>
                      <View style={[styles.checkbox, styles.checkboxChecked]}><Ionicons name="checkmark" size={15} color="#fff" /></View>
                      <Text style={[styles.itemName, styles.itemNameChecked]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* CÔTÉ MAISON */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>🧴 Côté Maison</Text>
            <View style={[styles.counterBadge, { backgroundColor: isDarkMode ? '#334155' : '#64748b15' }]}>
              <Text style={[styles.counterText, { color: subTextColor }]}>{activeExtraItems.length} à acheter</Text>
            </View>
          </View>

          <View style={[styles.listCard, { backgroundColor: cardBgColor, borderColor }]}>
            <View style={[styles.addExtraContainer, { borderBottomColor: borderColor }]}>
              <TextInput style={[styles.addExtraInput, { backgroundColor: inputBgColor, color: textColor }]} placeholder="Ajouter un indispensable (Ex: Savon...)" placeholderTextColor={subTextColor} value={newExtraItem} onChangeText={setNewExtraItem} onSubmitEditing={handleAddExtra} returnKeyType="done" />
              <TouchableOpacity style={[styles.addExtraBtn, !newExtraItem.trim() && { opacity: 0.5 }]} onPress={handleAddExtra} disabled={!newExtraItem.trim()}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {activeExtraItems.map((item) => (
              <View key={item.id} style={[styles.listItem, { borderBottomColor: borderColor }]}>
                <TouchableOpacity style={styles.itemLeft} onPress={() => toggleShoppingItem(item.id)} activeOpacity={0.6}>
                  <View style={styles.checkbox} />
                  <Text style={[styles.itemName, { color: textColor }]}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeShoppingItem(item.id)} style={styles.deleteExtraBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            {reserveItems.length > 0 && (
              <View style={[styles.reserveContainer, { backgroundColor: reserveBgColor, borderTopColor: borderColor }]}>
                <TouchableOpacity style={[styles.reserveHeader, { backgroundColor: reserveBgColor }]} onPress={() => setShowReserve(!showReserve)} activeOpacity={0.7}>
                  <View style={styles.reserveHeaderLeft}>
                    <Ionicons name={showReserve ? "eye-outline" : "eye-off-outline"} size={18} color="#0EA5E9" />
                    <Text style={[styles.reserveHeaderText, { color: subTextColor }]}>Articles en réserve ({reserveItems.length})</Text>
                  </View>
                  <Ionicons name={showReserve ? "chevron-up" : "chevron-down"} size={18} color={subTextColor} />
                </TouchableOpacity>
                {showReserve && (
                  <View style={styles.reserveList}>
                    {reserveItems.map((name, idx) => (
                      <View key={idx} style={[styles.reserveItem, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.reserveItemName, { color: textColor }]}>{name}</Text>
                        <View style={styles.reserveActions}>
                          <TouchableOpacity style={[styles.reactivateBtn, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: isDarkMode ? '#059669' : '#a7f3d0' }]} onPress={() => addExtraItem(name)}>
                            <Ionicons name="cart-outline" size={18} color="#10B981" />
                            <Text style={styles.reactivateBtnText}>Besoin</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.forgetBtn, { backgroundColor: tagBgColor }]} onPress={() => deleteExtraByName(name)}>
                            <Ionicons name="close" size={16} color={subTextColor} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CleanAssistant visible={cleanVisible} item={cleanQueue[cleanIndex] ?? null} progress={{ current: cleanIndex + 1, total: cleanQueue.length }} onHaveIt={() => advanceClean(false)} onNeedIt={() => advanceClean(true)} onCancel={cancelClean} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  profileBadge: { padding: 11, borderRadius: 15, elevation: 2, shadowColor: '#FF7A41', shadowOpacity: 0.1, shadowRadius: 10 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 110 },

  progressCard: { borderRadius: 18, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: '800' },
  progressPct: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  generateBtn: { flex: 1, backgroundColor: '#FF7A41', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8, elevation: 4, shadowColor: '#FF7A41', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cleanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8, borderWidth: 1 },
  cleanBtnText: { color: '#10B981', fontSize: 15, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  counterBadge: { backgroundColor: '#FF7A4115', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  counterText: { color: '#FF7A41', fontWeight: '700', fontSize: 13 },

  listCard: { borderRadius: 20, paddingVertical: 4, elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  itemTextContent: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '700' },
  itemNameChecked: { color: '#94a3b8', textDecorationLine: 'line-through', fontWeight: '600' },
  dishTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  dishTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dishTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  doneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, marginTop: 6 },
  doneHeaderText: { fontSize: 13, fontWeight: '700' },

  addExtraContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  addExtraInput: { flex: 1, height: 45, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginRight: 10 },
  addExtraBtn: { backgroundColor: '#FF7A41', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteExtraBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 10 },

  reserveContainer: { borderTopWidth: 1 },
  reserveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  reserveHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reserveHeaderText: { fontSize: 15, fontWeight: '700' },
  reserveList: { paddingVertical: 5 },
  reserveItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1 },
  reserveItemName: { fontSize: 16, fontWeight: '500' },
  reserveActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactivateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4, borderWidth: 1 },
  reactivateBtnText: { color: '#10B981', fontSize: 13, fontWeight: '700' },
  forgetBtn: { padding: 6, borderRadius: 8 },
});
