import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from '@/hooks/useThemeColors';
import { getCurrentWeekDateKeys, toDateKey } from "@/utils/date";

export default function HomeScreen() {
  const router = useRouter();
  const { data, syncing, syncError, syncNow } = useApp();
  const { displayName } = useAuth();
  const {
    background: backgroundColor,
    text: textColor,
    subText: subTextColor,
    card: cardBgColor,
    track: trackColor,
  } = useThemeColors();

  const firstName = displayName;
  const initials = firstName.substring(0, 2).toUpperCase();

  // --- Date & repas du jour ---
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateLabelCap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const todayPlan = data.weekPlan[todayKey];
  const todayDish = todayPlan ? data.dishes.find((d) => d.id === todayPlan.dishId) : null;

  // --- Compteurs (semaine en cours uniquement) ---
  const currentWeekKeys = useMemo(() => getCurrentWeekDateKeys(today), [today]);
  const plannedCount = useMemo(
    () => currentWeekKeys.filter((k) => data.weekPlan[k]).length,
    [currentWeekKeys, data.weekPlan]
  );
  const shoppingCount = data.shoppingList.filter((i) => !i.checked).length;
  const shoppingChecked = data.shoppingList.filter((i) => i.checked).length;
  const dishCount = data.dishes.length;
  const catCount = data.categories.length;
  const progressPct = Math.round((plannedCount / currentWeekKeys.length) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{dateLabelCap}</Text>
          <Text style={[styles.title, { color: textColor }]}>Bonjour {firstName}</Text>
        </View>
        <TouchableOpacity style={styles.profileBadge} onPress={() => router.push('/settings')} activeOpacity={0.7}>
          <Text style={styles.profileInitials}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {syncError && (
          <TouchableOpacity style={styles.syncBanner} onPress={syncNow} activeOpacity={0.8}>
            <Ionicons name="cloud-offline-outline" size={18} color="#b45309" />
            <Text style={styles.syncBannerText}>{syncError}</Text>
            <Ionicons name={syncing ? 'sync' : 'refresh'} size={16} color="#b45309" />
          </TouchableOpacity>
        )}

        {/* CARTE "CE SOIR" */}
        <TouchableOpacity activeOpacity={0.9} style={styles.tonightCard} onPress={() => router.push('/planner')}>
          <Text style={styles.tonightEyebrow}>🍽️ CE SOIR</Text>
          <Text style={styles.tonightMeal}>{todayDish ? todayDish.name : "Rien de prévu"}</Text>
          <View style={styles.tonightActions}>
            <View style={styles.tonightBtnGhost}>
              <Ionicons name={todayDish ? "swap-horizontal" : "add"} size={16} color="#fff" />
              <Text style={styles.tonightBtnGhostText}>{todayDish ? "Changer" : "Planifier"}</Text>
            </View>
            <TouchableOpacity style={styles.tonightBtnSolid} onPress={() => router.push('/shopping')}>
              <Ionicons name="cart" size={16} color="#FF7A41" />
              <Text style={styles.tonightBtnSolidText}>Ingrédients</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* CARTE PROGRESSION SEMAINE */}
        <TouchableOpacity activeOpacity={0.8} style={[styles.weekCard, { backgroundColor: cardBgColor }]} onPress={() => router.push('/planner')}>
          <View style={[styles.weekRing, { backgroundColor: '#FF7A4115' }]}>
            <Text style={styles.weekRingText}>{plannedCount}/{currentWeekKeys.length}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekTitle, { color: textColor }]}>Ta semaine</Text>
            <Text style={[styles.weekSub, { color: subTextColor }]}>
              {plannedCount >= currentWeekKeys.length ? "Semaine complète 🎉" : `${currentWeekKeys.length - plannedCount} jour(s) sans repas`}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        {/* GRILLE RACCOURCIS */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={[styles.gridCard, { backgroundColor: cardBgColor }]} onPress={() => router.push("/shopping")} activeOpacity={0.8}>
            <View style={styles.gridTop}>
              <Ionicons name="cart" size={24} color="#10B981" />
              <View style={[styles.gridBadge, { backgroundColor: '#10B98115' }]}><Text style={[styles.gridBadgeText, { color: '#10B981' }]}>{shoppingCount}</Text></View>
            </View>
            <Text style={[styles.gridTitle, { color: textColor }]}>Courses</Text>
            <Text style={[styles.gridDesc, { color: subTextColor }]}>{shoppingChecked} déjà cochés</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridCard, { backgroundColor: cardBgColor }]} onPress={() => router.push("/edit")} activeOpacity={0.8}>
            <View style={styles.gridTop}>
              <Ionicons name="restaurant" size={24} color="#FF7A41" />
              <View style={[styles.gridBadge, { backgroundColor: '#FF7A4115' }]}><Text style={[styles.gridBadgeText, { color: '#FF7A41' }]}>{dishCount}</Text></View>
            </View>
            <Text style={[styles.gridTitle, { color: textColor }]}>Garde-manger</Text>
            <Text style={[styles.gridDesc, { color: subTextColor }]}>{catCount} catégorie(s)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  eyebrow: { fontSize: 13, color: '#FF7A41', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  profileBadge: { backgroundColor: '#1e293b', width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  profileInitials: { color: '#fff', fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
  syncBannerText: { flex: 1, color: '#b45309', fontSize: 13, fontWeight: '700' },

  tonightCard: { backgroundColor: '#FF7A41', borderRadius: 26, padding: 22, marginBottom: 14 },
  tonightEyebrow: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  tonightMeal: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 6 },
  tonightActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tonightBtnGhost: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  tonightBtnGhostText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tonightBtnSolid: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  tonightBtnSolidText: { color: '#FF7A41', fontWeight: '700', fontSize: 13 },

  weekCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 22, padding: 18, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  weekRing: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  weekRingText: { fontSize: 16, fontWeight: '900', color: '#FF7A41' },
  weekTitle: { fontSize: 16, fontWeight: '800' },
  weekSub: { fontSize: 13, fontWeight: '500', marginTop: 1, marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF7A41', borderRadius: 4 },

  gridContainer: { flexDirection: 'row', gap: 14 },
  gridCard: { flex: 1, borderRadius: 22, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  gridTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  gridBadgeText: { fontSize: 12, fontWeight: '800' },
  gridTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  gridDesc: { fontSize: 12, fontWeight: '500', marginTop: 1 },
});
