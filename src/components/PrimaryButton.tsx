import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../theme";
type Props = { title: string; onPress: () => void; disabled?: boolean };
export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.green,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  text: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
