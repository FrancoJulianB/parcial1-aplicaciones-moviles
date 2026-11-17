import React, { useRef, useState } from "react";
import {
  Button,
  Image,
  Linking,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useAppStore } from "../store/useAppStore";
import { common, colors } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { validateProduct } from "../utils/validators";
import { pickPhoto, PhotoSource } from "../services/imagePicker";

export default function AddProductScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Alta">) {
  const addProduct = useAppStore((state) => state.addProduct);
  const busy = useAppStore((state) => state.busy);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(false);
  const locked = useRef(false);

  async function choose(source: PhotoSource) {
    if (locked.current || busy) return;
    locked.current = true;
    setWorking(true);
    setSettings(false);
    setMessage(source === "camera" ? "Comprobando permiso de cámara…" : "Comprobando permiso de galería…");
    try {
      const result = await pickPhoto(source);
      if (result.status === "denied") {
        setSettings(!result.canAskAgain);
        setMessage(
          (source === "camera"
            ? "No hay permiso para usar la cámara. Podés elegir una foto de la galería."
            : "No hay permiso para acceder a la galería.") +
          (result.canAskAgain ? " Podés volver a solicitarlo con el botón." : " Habilitá el permiso desde Ajustes."),
        );
      } else if (result.status === "selected") {
        setPhoto(result.uri);
        setMessage("");
      } else {
        setMessage("");
      }
    } catch {
      setMessage("No se pudo cargar la foto. Intentá nuevamente.");
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }

  async function submit() {
    if (locked.current || busy) return;
    const validation = validateProduct(name, quantity);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    locked.current = true;
    try {
      await addProduct(name, Number(quantity), photo);
      navigation.goBack();
    } catch {
      setError("No se pudo guardar el producto. Intentá nuevamente.");
    } finally {
      locked.current = false;
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
            editable={!busy && !working}
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
            editable={!busy && !working}
          />
        </View>
        <Text style={common.label}>Foto (opcional)</Text>
        {photo && (
          <Image source={{ uri: photo }} accessibilityLabel="Foto del nuevo producto"
            resizeMode="contain"
            style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: colors.white }} />
        )}
        <PrimaryButton title="Tomar foto" onPress={() => choose("camera")} disabled={busy || working} />
        <PrimaryButton title="Elegir de la galería" onPress={() => choose("library")} disabled={busy || working} />
        {photo && (
          <Button title="Quitar foto" color={colors.red} disabled={busy || working}
            onPress={() => { setPhoto(undefined); setMessage(""); setSettings(false); }} />
        )}
        {!!message && <Text accessibilityRole="alert" style={common.subtitle}>{message}</Text>}
        {settings && (
          <Button title="Abrir Ajustes" color={colors.green} disabled={busy || working}
            onPress={() => Linking.openSettings().catch(() => setMessage("Abrí Ajustes del teléfono para habilitar el permiso."))} />
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={common.error}>
            {error}
          </Text>
        )}
        <PrimaryButton
          title={busy ? "Guardando…" : "Guardar producto"}
          onPress={submit}
          disabled={busy || working}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
