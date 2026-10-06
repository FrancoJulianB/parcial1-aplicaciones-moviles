import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Button,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useApp } from "../context/AppContext";
import { common, colors } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { validateCredentials } from "../utils/validators";
export default function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Login">) {
  const { login, busy } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    const validation = validateCredentials(username, password);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    }
  }
  return (
    <KeyboardAvoidingView
      style={common.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          common.content,
          { flexGrow: 1, justifyContent: "center" },
        ]}
      >
        <Text style={[common.label, { color: colors.green }]}>
          MI LISTA DE COMPRAS
        </Text>
        <Text style={common.title}>Todo listo para comprar.</Text>
        <Text style={common.subtitle}>
          Iniciá sesión para organizar tu próxima compra.
        </Text>
        <View>
          <Text style={common.label}>Usuario</Text>
          <TextInput
            accessibilityLabel="Usuario"
            style={common.input}
            placeholder="Tu usuario"
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
            placeholder="Tu contraseña"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
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
          title={busy ? "Ingresando…" : "Iniciar sesión"}
          onPress={submit}
          disabled={busy}
        />
        <Button
          title="Crear una cuenta"
          color={colors.green}
          disabled={busy}
          onPress={() => navigation.navigate("Registro")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
