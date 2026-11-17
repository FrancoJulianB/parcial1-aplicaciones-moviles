import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductContact } from "../types";
import { ContactChoice, loadPhoneContacts } from "../services/contacts";
import { colors, common } from "../theme";
import PrimaryButton from "./PrimaryButton";

type Props = {
  value?: ProductContact;
  disabled?: boolean;
  onChange: (contact: ProductContact | undefined) => void | Promise<void>;
  onWorking: (working: boolean) => void;
};

export default function ContactField({
  value,
  disabled,
  onChange,
  onWorking,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<ContactChoice[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [settings, setSettings] = useState(false);
  const request = useRef(0);
  const selecting = useRef(false);
  const savingContact = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, []);

  function close() {
    if (savingContact.current) {
      return;
    }

    request.current += 1;
    selecting.current = false;
    setOpen(false);
    setLoading(false);
    setContacts([]);
    setQuery("");
    setAccessMessage("");
    setSettings(false);
    onWorking(false);
  }

  async function choose() {
    if (disabled || selecting.current || savingContact.current) {
      return;
    }

    const current = request.current + 1;

    request.current = current;
    selecting.current = true;
    setOpen(true);
    setLoading(true);
    setContacts([]);
    setQuery("");
    setMessage("");
    setAccessMessage("Comprobando permiso y cargando contactos…");
    setSettings(false);
    onWorking(true);

    try {
      const result = await loadPhoneContacts();

      if (!mounted.current || current !== request.current) {
        return;
      }

      if (result.status === "denied") {
        setSettings(!result.canAskAgain);
        setAccessMessage(
          "Permiso de contactos denegado. Podés ingresar el contacto manualmente." +
            (result.canAskAgain
              ? " Cerrá y volvé a intentar para solicitarlo."
              : " Habilitá el permiso desde Ajustes."),
        );
      } else {
        setContacts(result.contacts);
        setSettings(result.limited);
        setAccessMessage(
          result.limited
            ? "Acceso limitado: solo se muestran los contactos que autorizaste. Podés cambiar el acceso en Ajustes."
            : "Acceso concedido. Elegí un contacto.",
        );
      }
    } catch {
      if (mounted.current && current === request.current) {
        setAccessMessage(
          "No se pudieron cargar los contactos. Podés reintentar o ingresar el contacto manualmente.",
        );
      }
    } finally {
      if (mounted.current && current === request.current) {
        setLoading(false);
      }
    }
  }

  async function save(contact: ProductContact | undefined) {
    if (disabled || savingContact.current || loading) {
      return;
    }

    savingContact.current = true;
    setSaving(true);
    setMessage("");
    onWorking(true);

    try {
      await onChange(contact);

      if (mounted.current) {
        savingContact.current = false;
        close();
        setMessage(contact ? "Contacto asociado." : "Contacto quitado.");
      }
    } catch {
      if (mounted.current) {
        setMessage("No se pudo guardar el contacto. Intentá nuevamente.");
      }
    } finally {
      savingContact.current = false;

      if (mounted.current) {
        setSaving(false);
        onWorking(selecting.current);
      }
    }
  }

  function useManual() {
    if (!name.trim()) {
      setMessage("Ingresá el nombre del contacto.");

      return;
    }

    return save({
      source: "manual",
      name: name.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
    });
  }

  const search = query.trim().toLowerCase();
  const filtered = contacts.filter((item) => {
    return [item.contact.name, item.contact.phone, item.contact.email].some(
      (text) => {
        return text?.toLowerCase().includes(search);
      },
    );
  });

  return (
    <View style={styles.section}>
      <Text style={common.label}>Contacto (opcional)</Text>
      {value ? (
        <View>
          <Text style={common.subtitle}>{value.name}</Text>
          {value.phone && (
            <Text style={common.subtitle}>Teléfono: {value.phone}</Text>
          )}
          {value.email && (
            <Text style={common.subtitle}>Email: {value.email}</Text>
          )}
          <Text style={common.subtitle}>
            {value.source === "phone"
              ? "Contacto del teléfono"
              : "Contacto ingresado manualmente"}
          </Text>
        </View>
      ) : (
        <Text style={common.subtitle}>Sin contacto asociado.</Text>
      )}
      <PrimaryButton
        title={value ? "Reemplazar contacto" : "Elegir contacto del teléfono"}
        onPress={choose}
        disabled={disabled || saving || open}
      />
      <Text style={common.label}>Contacto manual</Text>
      <TextInput
        accessibilityLabel="Nombre del contacto"
        placeholder="Nombre"
        placeholderTextColor={colors.muted}
        style={common.input}
        value={name}
        maxLength={100}
        onChangeText={setName}
        editable={!disabled && !saving && !open}
      />
      <TextInput
        accessibilityLabel="Teléfono del contacto"
        placeholder="Teléfono (opcional)"
        placeholderTextColor={colors.muted}
        style={common.input}
        value={phone}
        maxLength={60}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!disabled && !saving && !open}
      />
      <TextInput
        accessibilityLabel="Email del contacto"
        placeholder="Email (opcional)"
        placeholderTextColor={colors.muted}
        style={common.input}
        value={email}
        maxLength={200}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled && !saving && !open}
      />
      <Button
        title="Usar contacto manual"
        color={colors.green}
        onPress={useManual}
        disabled={disabled || saving || open}
      />
      {value && (
        <Button
          title="Quitar contacto"
          color={colors.red}
          onPress={() => {
            return save(undefined);
          }}
          disabled={disabled || saving || open}
        />
      )}
      {saving && (
        <ActivityIndicator
          accessibilityLabel="Guardando contacto"
          color={colors.green}
        />
      )}
      {!!message && !open && (
        <Text
          accessibilityRole="alert"
          style={common.subtitle}
        >
          {message}
        </Text>
      )}
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={close}
      >
        <SafeAreaView style={common.page}>
          <View style={styles.selector}>
            <Text style={common.title}>Elegir contacto</Text>
            <Text
              accessibilityRole="alert"
              style={common.subtitle}
            >
              {accessMessage}
            </Text>
            {loading && (
              <ActivityIndicator
                accessibilityLabel="Cargando contactos"
                color={colors.green}
              />
            )}
            {settings && (
              <Button
                title="Abrir Ajustes de contactos"
                color={colors.green}
                disabled={saving}
                onPress={() => {
                  return Linking.openSettings().catch(() => {
                    setAccessMessage(
                      "Abrí Ajustes del teléfono para cambiar el acceso a contactos.",
                    );
                  });
                }}
              />
            )}
            <TextInput
              accessibilityLabel="Buscar contactos"
              placeholder="Buscar por nombre, teléfono o email"
              placeholderTextColor={colors.muted}
              style={common.input}
              value={query}
              onChangeText={setQuery}
              editable={!loading && !saving}
            />
            <FlatList
              data={filtered}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => {
                return item.id;
              }}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={"Elegir " + item.contact.name}
                    style={styles.contact}
                    disabled={loading || saving}
                    onPress={() => {
                      return save(item.contact);
                    }}
                  >
                    <Text style={common.label}>{item.contact.name}</Text>
                    {item.contact.phone && (
                      <Text style={common.subtitle}>{item.contact.phone}</Text>
                    )}
                    {item.contact.email && (
                      <Text style={common.subtitle}>{item.contact.email}</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !loading ? (
                  <Text style={common.subtitle}>
                    {contacts.length
                      ? "No hay coincidencias para la búsqueda."
                      : "No hay contactos disponibles. Podés ingresar uno manualmente."}
                  </Text>
                ) : undefined
              }
            />
            {!!message && (
              <Text
                accessibilityRole="alert"
                style={common.error}
              >
                {message}
              </Text>
            )}
            <Button
              title="Ingresar contacto manualmente"
              color={colors.green}
              onPress={close}
              disabled={saving}
            />
            <Button
              title="Cancelar selección"
              color={colors.muted}
              onPress={close}
              disabled={saving}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  selector: { flex: 1, padding: 24, gap: 12 },
  contact: {
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
