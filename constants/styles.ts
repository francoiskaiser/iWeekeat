import { StyleSheet, Text, TextStyle, ViewStyle } from "react-native";
import { COLORS } from "@/constants";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 15,
    paddingVertical: 24,
    lineHeight: 22,
  },
});

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  } as ViewStyle,
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  secondary: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  } as ViewStyle,
  secondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  danger: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  } as ViewStyle,
  dangerText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 8,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
});

export const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 48,
  },
  pickerContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
    justifyContent: "center",
  },
});
