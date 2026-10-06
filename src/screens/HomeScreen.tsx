import React from "react";
import { View, Text, FlatList, Alert, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useApp } from "../context/AppContext";
import { common, colors } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import ProductItem from "../components/ProductItem";
export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
  const {
    username,
    products,
    busy,
    logout,
    toggleProduct,
    deleteProduct,
    remind,
  } = useApp();
  const pending = products.filter((p) => !p.bought).length;
  async function perform(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      Alert.alert(
        "No se pudo completar",
        e instanceof Error ? e.message : "Intentá nuevamente.",
      );
    }
  }
  function remove(id: string) {
    Alert.alert("Eliminar producto", "¿Querés quitarlo de tu lista?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => perform(() => deleteProduct(id)),
      },
    ]);
  }
  return (
    <SafeAreaView style={common.page} edges={["bottom"]}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={common.subtitle}>Hola, {username}</Text>
            <Text style={common.title}>Tu próxima compra.</Text>
            <View style={styles.summary}>
              <Text style={styles.count}>{pending}</Text>
              <Text style={common.subtitle}>
                pendientes · {products.length - pending} comprados
              </Text>
            </View>
            <PrimaryButton
              title="Agregar producto"
              onPress={() => navigation.navigate("Alta")}
              disabled={busy}
            />
            <Button
              title="Recordarme en 10 segundos"
              color={colors.green}
              disabled={busy || pending === 0}
              onPress={() =>
                perform(async () => {
                  await remind();
                  Alert.alert(
                    "Recordatorio programado",
                    "Recibirás una notificación en 10 segundos.",
                  );
                })
              }
            />
            <Text style={styles.note}>
              Si modificás la lista, volvé a programar el recordatorio.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductItem
            product={item}
            disabled={busy}
            onToggle={() => perform(() => toggleProduct(item.id))}
            onDelete={() => remove(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Tu lista empieza acá.</Text>
            <Text style={common.subtitle}>
              Agregá el primer producto para organizar tus compras.
            </Text>
          </View>
        }
      />
      <View style={styles.footer}>
        <Button
          title="Cerrar sesión"
          color={colors.muted}
          disabled={busy}
          onPress={() => perform(logout)}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  list: { padding: 24, flexGrow: 1 },
  header: { gap: 14, marginBottom: 20 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#E4EEE6",
  },
  count: { fontSize: 36, fontWeight: "700", color: colors.green },
  note: { fontSize: 12, color: colors.muted, textAlign: "center" },
  empty: { paddingVertical: 32, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.ink },
  footer: { padding: 10, borderTopWidth: 1, borderColor: colors.line },
});
