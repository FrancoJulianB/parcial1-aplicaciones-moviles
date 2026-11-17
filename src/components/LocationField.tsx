import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Linking,
  Text,
  TextInput,
  View,
} from "react-native";
import { ShopLocation } from "../types";
import { currentShopLocation } from "../services/location";
import { colors, common } from "../theme";
import PrimaryButton from "./PrimaryButton";

type Props = {
  value?: ShopLocation;
  disabled?: boolean;
  onChange: (value: ShopLocation | undefined) => void | Promise<void>;
  onWorking: (working: boolean) => void;
};

export default function LocationField({
  value,
  disabled,
  onChange,
  onWorking,
}: Props) {
  const [address, setAddress] = useState(
    value?.source === "manual" ? value.address : "",
  );
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(false);
  const locked = useRef(false);

  async function perform(action: () => Promise<void>) {
    if (locked.current || disabled) {
      return;
    }

    locked.current = true;
    setWorking(true);
    onWorking(true);
    setSettings(false);

    try {
      await action();
    } catch {
      setMessage("No se pudo guardar la ubicación. Intentá nuevamente.");
    } finally {
      locked.current = false;
      setWorking(false);
      onWorking(false);
    }
  }

  async function locate() {
    await perform(async () => {
      setMessage("Comprobando permiso y obteniendo ubicación…");

      const result = await currentShopLocation();

      if (result.status === "denied") {
        setSettings(!result.canAskAgain);
        setMessage(
          "Permiso de ubicación denegado. Podés ingresar el comercio manualmente." +
            (result.canAskAgain
              ? " Volvé a solicitarlo con el botón."
              : " Habilitalo desde Ajustes."),
        );
      } else if (result.status === "unavailable") {
        setMessage(
          "No se pudo obtener la ubicación. Comprobá que la localización esté activada y reintentá, o ingresá el comercio manualmente.",
        );
      } else {
        await onChange(result.location);
        setMessage("Ubicación GPS asociada.");
      }
    });
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={common.label}>Comercio (opcional)</Text>
      {value?.source === "gps" ? (
        <Text style={common.subtitle}>
          Ubicación GPS: {value.latitude.toFixed(6)}
          {", "}
          {value.longitude.toFixed(6)}
        </Text>
      ) : value?.source === "manual" ? (
        <Text style={common.subtitle}>
          Comercio ingresado manualmente: {value.address}
        </Text>
      ) : (
        <Text style={common.subtitle}>Sin ubicación asociada.</Text>
      )}
      <PrimaryButton
        title={
          value?.source === "gps"
            ? "Actualizar ubicación actual"
            : "Usar ubicación actual"
        }
        onPress={locate}
        disabled={disabled || working}
      />
      {working && (
        <ActivityIndicator
          accessibilityLabel="Obteniendo o guardando ubicación"
          color={colors.green}
        />
      )}
      <Text style={common.label}>Nombre o dirección manual</Text>
      <TextInput
        accessibilityLabel="Nombre o dirección del comercio"
        style={common.input}
        placeholder="Por ejemplo: Almacén de la esquina"
        placeholderTextColor={colors.muted}
        value={address}
        onChangeText={setAddress}
        maxLength={200}
        editable={!disabled && !working}
      />
      <Button
        title="Usar comercio manual"
        color={colors.green}
        disabled={disabled || working}
        onPress={() => {
          if (!address.trim()) {
            setMessage("Ingresá el nombre o la dirección del comercio.");

            return;
          }

          perform(async () => {
            await onChange({ source: "manual", address: address.trim() });
            setMessage("Comercio manual asociado.");
          });
        }}
      />
      {value && (
        <Button
          title="Quitar ubicación"
          color={colors.red}
          disabled={disabled || working}
          onPress={() => {
            return perform(async () => {
              await onChange(undefined);
              setAddress("");
              setMessage("Ubicación quitada.");
            });
          }}
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
          title="Abrir Ajustes de ubicación"
          color={colors.green}
          onPress={() => {
            return Linking.openSettings().catch(() => {
              return setMessage("Abrí Ajustes para habilitar la ubicación.");
            });
          }}
        />
      )}
    </View>
  );
}
