import { Modal, StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CleanItem } from "@/context/AppContext";
import { useThemeColors } from "@/hooks/useThemeColors";

interface CleanAssistantProps {
  visible: boolean;
  item: CleanItem | null;
  progress: { current: number; total: number };
  onHaveIt: () => void;
  onNeedIt: () => void;
  onCancel: () => void;
}

export function CleanAssistant({
  visible,
  item,
  progress,
  onHaveIt,
  onNeedIt,
  onCancel,
}: CleanAssistantProps) {
  const { background, text, subText, card, border } = useThemeColors();

  if (!item) return null;

  const progressPercent = Math.round((progress.current / progress.total) * 100);

  // LOGIQUE VISUELLE INTELLIGENTE
  const isFood = !item.isExtra;
  const themeColor = isFood ? "#FF7A41" : "#0EA5E9"; // Orange pour la cuisine, Bleu pour la maison
  const iconName = isFood ? "restaurant-outline" : "home-outline";
  const questionText = isFood ? "Est-ce qu'il vous reste..." : "Avez-vous encore du...";
  const locationText = isFood ? "dans vos placards / frigo ?" : "en réserve ?";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <View style={styles.container}>

          <View style={styles.header}>
            <View style={[styles.badgeContainer, { backgroundColor: themeColor + '15' }]}>
              <Ionicons name="scan-outline" size={16} color={themeColor} />
              <Text style={[styles.badgeText, { color: themeColor }]}>Inventaire en cours</Text>
            </View>

            <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Ionicons name="close-circle" size={32} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressSection}>
            <View style={[styles.progressBarBg, { backgroundColor: border }]}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: themeColor }]} />
            </View>
            <Text style={[styles.progressText, { color: subText }]}>
              Article {progress.current} sur {progress.total}
            </Text>
          </View>

          <View style={styles.body}>
            <View style={[styles.iconWrapper, { shadowColor: themeColor, backgroundColor: card }]}>
              <Ionicons name={iconName} size={60} color={themeColor} />
            </View>

            <Text style={[styles.question, { color: subText }]}>{questionText}</Text>
            <Text style={[styles.ingredient, { color: text }]}>{item.name}</Text>
            <Text style={[styles.question, { color: subText }]}>{locationText}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnHaveIt]} 
              onPress={onHaveIt}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.btnHaveItText}>Oui, j&apos;en ai déjà !</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnNeedIt, { borderColor: themeColor }]} 
              onPress={onNeedIt}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={24} color={themeColor} />
              <Text style={[styles.btnNeedItText, { color: themeColor }]}>Non, il faut l&apos;acheter</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    alignSelf: "center",
  },
  progressSection: {
    marginBottom: 40,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: 'right',
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: -40,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  question: {
    fontSize: 20,
    textAlign: "center",
    fontWeight: '500',
  },
  ingredient: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    marginVertical: 15,
    letterSpacing: -0.5,
  },
  actions: {
    gap: 16,
    paddingBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  btnHaveIt: {
    backgroundColor: '#10B981',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnHaveItText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  btnNeedIt: {
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  btnNeedItText: {
    fontSize: 18,
    fontWeight: '800',
  },
});