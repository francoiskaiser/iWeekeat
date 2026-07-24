import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ label, checked, onToggle }: ChecklistItemProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressed: {
    backgroundColor: "#f9fafb",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  label: {
    flex: 1,
    fontSize: 17,
    color: COLORS.text,
  },
  labelChecked: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
});
