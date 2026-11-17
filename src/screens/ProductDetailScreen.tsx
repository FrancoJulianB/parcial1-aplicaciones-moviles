import React, { useRef, useState } from "react";
import {
  Button,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { useAppStore } from "../store/useAppStore";
import { pickPhoto, PhotoSource } from "../services/imagePicker";
import { photoUri } from "../services/photos";
import { colors, common } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

import LocationField from "../components/LocationField";

export default function ProductDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Detalle">) {
  const product = useAppStore((state) => {
    return state.products.find((p) => {
      return p.id === route.params.id;
    });
  });
  const busy = useAppStore((state) => {
    return state.busy;
  });
  const setProductPhoto = useAppStore((state) => {
    return state.setProductPhoto;
  });
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(false);
  const setProductLocation = useAppStore((state) => {
    return state.setProductLocation;
  });
  const [locating, setLocating] = useState(false);
  const locked = useRef(false);

  async function choose(source: PhotoSource) {
    if (locked.current || busy || locating) {
      return;
    }

    locked.current = true;
    setWorking(true);
    setSettings(false);
    setMessage(
      source === "camera"
        ? "Comprobando permiso de cámara…"
        : "Comprobando permiso de galería…",
    );

    try {
      const result = await pickPhoto(source);

      if (result.status === "denied") {
        setSettings(!result.canAskAgain);
        setMessage(
          (source === "camera"
            ? "No hay permiso para usar la cámara. Podés elegir una foto de la galería."
            : "No hay permiso para acceder a la galería.") +
            (result.canAskAgain
              ? " Podés volver a solicitarlo con el botón."
              : " Habilitá el permiso desde Ajustes."),
        );
      } else if (result.status === "selected") {
        setMessage("Guardando foto…");
        await setProductPhoto(route.params.id, result.uri);
        setMessage("Foto guardada.");
      } else {
        setMessage("");
      }
    } catch {
      setMessage("No se pudo cargar o guardar la foto. Intentá nuevamente.");
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }

  async function remove() {
    if (locked.current || busy || locating) {
      return;
    }

    locked.current = true;
    setWorking(true);
    setSettings(false);

    try {
      await setProductPhoto(route.params.id, null);
      setMessage("Foto quitada.");
    } catch {
      setMessage("No se pudo quitar la foto. Intentá nuevamente.");
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }

  if (!product) {
    return (
      <Text style={common.subtitle}>El producto ya no está disponible.</Text>
    );
  }

  return (
    <SafeAreaView
      style={common.page}
      edges={["bottom"]}
    >
      <ScrollView contentContainerStyle={common.content}>
        <Text style={common.title}>{product.name}</Text>
        <Text style={common.subtitle}>Cantidad: {product.quantity}</Text>
        <Text style={common.subtitle}>
          {product.bought ? "Comprado" : "Pendiente"}
        </Text>
        {product.photo ? (
          <Image
            source={{ uri: photoUri(product.photo) }}
            style={styles.photo}
            accessibilityLabel={"Foto de " + product.name}
            resizeMode="contain"
          />
        ) : (
          <Text style={common.subtitle}>
            Este producto todavía no tiene foto.
          </Text>
        )}
        <Text style={common.subtitle}>
          {product.photo
            ? "Elegí otra imagen para reemplazar la foto."
            : "Agregá una foto de la cámara o la galería."}
        </Text>
        <PrimaryButton
          title="Tomar foto"
          onPress={() => {
            return choose("camera");
          }}
          disabled={busy || working || locating}
        />
        <PrimaryButton
          title="Elegir de la galería"
          onPress={() => {
            return choose("library");
          }}
          disabled={busy || working || locating}
        />
        {product.photo && (
          <Button
            title="Quitar foto"
            color={colors.red}
            onPress={remove}
            disabled={busy || working || locating}
          />
        )}
        {!!message && (
          <Text
            accessibilityRole="alert"
            style={common.subtitle}
          >
            {message}
          </Text>
        )}
        {settings && (
          <Button
            title="Abrir Ajustes"
            color={colors.green}
            disabled={working}
            onPress={() => {
              return Linking.openSettings().catch(() => {
                return setMessage(
                  "Abrí Ajustes del teléfono para habilitar el permiso.",
                );
              });
            }}
          />
        )}
        <LocationField
          value={product.location}
          disabled={busy || working}
          onWorking={setLocating}
          onChange={(location) => {
            return setProductLocation(product.id, location);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
});
