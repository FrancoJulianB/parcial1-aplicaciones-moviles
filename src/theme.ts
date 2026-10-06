import { StyleSheet } from "react-native";
export const colors = {
  ink: "#18332B",
  muted: "#63776F",
  green: "#26735B",
  light: "#F3F7F3",
  line: "#D8E3DB",
  white: "#FFFFFF",
  red: "#AF3636",
};
export const common = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.light },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.red, fontSize: 14, lineHeight: 20 },
});
