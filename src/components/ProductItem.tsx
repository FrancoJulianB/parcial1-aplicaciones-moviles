import React from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Product } from "../types";
import { colors } from "../theme";
import { photoUri } from "../services/photos";

type Props = {
  product: Product;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
  disabled?: boolean;
};
export default function ProductItem({
  product,
  onOpen,
  onToggle,
  onDelete,
  disabled,
}: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityLabel={`Marcar ${product.name}`}
        accessibilityState={{ checked: product.bought, disabled }}
        onPress={onToggle}
        style={styles.toggle}
      >
        <View style={[styles.check, product.bought && styles.checked]}>
          <Text style={styles.checkText}>{product.bought ? "✓" : ""}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={"Ver detalle de " + product.name}
        onPress={onOpen}
        style={styles.description}
      >
        {product.photo && (
          <Image source={{ uri: photoUri(product.photo) }} style={styles.thumbnail}
            accessibilityLabel={"Foto de " + product.name} />
        )}
        <View>
          <Text style={[styles.name, product.bought && styles.bought]}>
            {product.name}
          </Text>
          <Text style={styles.quantity}>Cantidad: {product.quantity}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${product.name}`}
        onPress={onDelete}
        style={styles.delete}
      >
        <Text style={styles.deleteText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  toggle: { padding: 8, marginRight: 4 },
  check: {
    width: 26,
    height: 26,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.green },
  checkText: { color: colors.white, fontWeight: "700" },
  description: { flex: 1, gap: 8 },
  thumbnail: { width: 56, height: 56, borderRadius: 8 },
  name: { color: colors.ink, fontSize: 17, fontWeight: "600" },
  bought: { textDecorationLine: "line-through", color: colors.muted },
  quantity: { color: colors.muted, fontSize: 13, marginTop: 4 },
  delete: { padding: 10 },
  deleteText: { color: colors.red, fontSize: 13 },
});
