import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useApp } from "../context/AppContext";
import { common, colors } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { validateProduct } from "../utils/validators";
export default function AddProductScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Alta">) {
  const { addProduct, busy } = useApp();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  async function submit() {
    const validation = validateProduct(name, quantity);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      await addProduct(name, Number(quantity));
      navigation.goBack();
    } catch {
      setError("No se pudo guardar el producto. Intentá nuevamente.");
    }
  }
  return (
    <KeyboardAvoidingView
      style={common.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={common.content}
      >
        <Text style={common.title}>¿Qué hace falta?</Text>
        <Text style={common.subtitle}>
          Agregá un producto a tu próxima compra.
        </Text>
        <View>
          <Text style={common.label}>Nombre del producto</Text>
          <TextInput
            accessibilityLabel="Nombre del producto"
            style={common.input}
            placeholder="Por ejemplo: leche"
            placeholderTextColor={colors.muted}
            maxLength={80}
            value={name}
            onChangeText={setName}
            editable={!busy}
          />
        </View>
        <View>
          <Text style={common.label}>Cantidad</Text>
          <TextInput
            accessibilityLabel="Cantidad"
            style={common.input}
            keyboardType="number-pad"
            maxLength={3}
            value={quantity}
            onChangeText={setQuantity}
            editable={!busy}
          />
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={common.error}>
            {error}
          </Text>
        )}
        <PrimaryButton
          title={busy ? "Guardando…" : "Guardar producto"}
          onPress={submit}
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
