import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { buttonStyles } from "@/constants/styles";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const containerStyle = [
    buttonStyles[variant === "primary" ? "primary" : variant === "secondary" ? "secondary" : "danger"],
    disabled && buttonStyles.disabled,
    style,
  ];

  const labelStyle = [
    buttonStyles[variant === "primary" ? "primaryText" : variant === "secondary" ? "secondaryText" : "dangerText"],
    textStyle,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [...containerStyle, pressed && styles.pressed]}
    >
      <Text style={labelStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
});
