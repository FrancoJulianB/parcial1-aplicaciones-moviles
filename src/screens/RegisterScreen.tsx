import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useApp } from "../context/AppContext";
import { common, colors } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { validateCredentials } from "../utils/validators";
export default function RegisterScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Registro">) {
  const { register, busy } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    const validation = validateCredentials(username, password);
    if (validation) {
      setError(validation);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    try {
      await register(username, password);
      Alert.alert("Cuenta creada", "Ya podés iniciar sesión con tus datos.");
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
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
        <Text style={common.title}>Creá tu cuenta.</Text>
        <Text style={common.subtitle}>
          Cada usuario tiene su propia lista en este teléfono.
        </Text>
        <View>
          <Text style={common.label}>Usuario</Text>
          <TextInput
            accessibilityLabel="Usuario"
            style={common.input}
            placeholder="Mínimo 3 caracteres"
            placeholderTextColor={colors.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
        </View>
        <View>
          <Text style={common.label}>Contraseña</Text>
          <TextInput
            accessibilityLabel="Contraseña"
            style={common.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!busy}
          />
        </View>
        <View>
          <Text style={common.label}>Repetir contraseña</Text>
          <TextInput
            accessibilityLabel="Repetir contraseña"
            style={common.input}
            placeholder="Confirmá tu contraseña"
            placeholderTextColor={colors.muted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!busy}
          />
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={common.error}>
            {error}
          </Text>
        )}
        <PrimaryButton
          title={busy ? "Guardando…" : "Registrarme"}
          onPress={submit}
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
