import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  showChevron?: boolean;
}

export function ListItem({
  title,
  subtitle,
  onPress,
  onDelete,
  selected = false,
  showChevron = false,
}: ListItemProps) {
  const handleDelete = () => {
    Alert.alert("Supprimer", `Supprimer « ${title} » ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selected,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable onPress={handleDelete} hitSlop={12} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </Pressable>
      ) : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  selected: {
    backgroundColor: COLORS.primaryLight,
  },
  pressed: {
    backgroundColor: "#f0f0f0",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  titleSelected: {
    color: COLORS.primaryDark,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
});
