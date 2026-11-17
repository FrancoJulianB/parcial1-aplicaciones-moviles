import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/useAppStore";
import {
  CalendarPermissionError,
  EditableCalendar,
  loadEditableCalendars,
  parseEventDate,
} from "../services/calendar";
import { colors, common } from "../theme";
import PrimaryButton from "./PrimaryButton";

type Props = {
  productId: string;
  disabled?: boolean;
  onWorking: (working: boolean) => void;
};

export default function CalendarReminder({
  productId,
  disabled,
  onWorking,
}: Props) {
  const product = useAppStore((state) => {
    return state.products.find((item) => {
      return item.id === productId;
    });
  });
  const createProductEvent = useAppStore((state) => {
    return state.createProductEvent;
  });
  const busy = useAppStore((state) => {
    return state.busy;
  });
  const [open, setOpen] = useState(false);
  const [calendars, setCalendars] = useState<EditableCalendar[]>([]);
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(false);
  const request = useRef(0);
  const locked = useRef(false);

  useEffect(() => {
    return () => {
      request.current += 1;
    };
  }, []);

  function cancel() {
    if (creating) {
      return;
    }

    request.current += 1;
    locked.current = false;
    setOpen(false);
    setLoading(false);
    setCalendars([]);
    setSelected("");
    setDate("");
    setTime("");
    setMessage("");
    setSettings(false);
    onWorking(false);
  }

  async function prepare() {
    if (disabled || busy || locked.current || product?.calendarEvent) {
      return;
    }

    const current = request.current + 1;

    request.current = current;
    locked.current = true;
    setOpen(true);
    setLoading(true);
    setCalendars([]);
    setSelected("");
    setMessage("Comprobando permiso y cargando calendarios…");
    setSettings(false);
    onWorking(true);

    try {
      const result = await loadEditableCalendars();

      if (current !== request.current) {
        return;
      }

      if (result.status === "denied") {
        setSettings(!result.canAskAgain);
        setMessage(
          "Permiso de calendario denegado." +
            (result.canAskAgain
              ? " Podés volver a solicitarlo con el botón."
              : " Habilitá el acceso desde Ajustes."),
        );
      } else if (result.status === "unavailable") {
        setMessage(
          "El calendario requiere una compilación de desarrollo. No está disponible en Expo Go.",
        );
      } else {
        setCalendars(result.calendars);
        setMessage(
          result.calendars.length
            ? "Elegí un calendario editable y una fecha y hora futuras."
            : "No hay calendarios editables disponibles. Agregá o habilitá uno en la app Calendario y reintentá.",
        );
      }
    } catch (error) {
      if (current === request.current) {
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los calendarios. Intentá nuevamente.",
        );
      }
    } finally {
      if (current === request.current) {
        locked.current = false;
        setLoading(false);
        onWorking(false);
      }
    }
  }

  async function create() {
    if (disabled || busy || locked.current) {
      return;
    }

    if (product?.calendarEvent) {
      setMessage("Este producto ya tiene un evento de calendario asociado.");

      return;
    }

    const start = parseEventDate(date, time);

    if (!start) {
      setMessage(
        "Ingresá una fecha válida (DD/MM/AAAA) y una hora futura (HH:MM).",
      );

      return;
    }

    if (!selected) {
      setMessage("Elegí un calendario editable.");

      return;
    }

    locked.current = true;
    setCreating(true);
    setMessage("Creando evento de compra…");
    onWorking(true);

    try {
      await createProductEvent(productId, selected, start.toISOString());
      setOpen(false);
      setCalendars([]);
      setMessage("Evento de compra creado.");
    } catch (error) {
      if (error instanceof CalendarPermissionError) {
        setSettings(!error.canAskAgain);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el evento. Intentá nuevamente.",
      );
    } finally {
      locked.current = false;
      setCreating(false);
      onWorking(false);
    }
  }

  if (!product) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={common.label}>Recordatorio en calendario (opcional)</Text>
      {product.calendarEvent ? (
        <View>
          <Text style={common.subtitle}>
            Este producto ya tiene un evento de calendario asociado.
          </Text>
          <Text style={common.subtitle}>
            Compra: {new Date(product.calendarEvent.startDate).toLocaleString()}
          </Text>
          <Text style={common.subtitle}>
            Calendario: {product.calendarEvent.calendarTitle}
          </Text>
          <Text style={common.subtitle}>
            Creado el:{" "}
            {new Date(product.calendarEvent.createdAt).toLocaleString()}
          </Text>
        </View>
      ) : (
        <PrimaryButton
          title={
            open ? "Volver a cargar calendarios" : "Crear evento de compra"
          }
          onPress={prepare}
          disabled={disabled || busy || loading || creating}
        />
      )}
      {(loading || creating) && (
        <ActivityIndicator
          accessibilityLabel="Procesando calendario"
          color={colors.green}
        />
      )}
      {open && !product.calendarEvent && (
        <View style={{ gap: 12 }}>
          {calendars.map((calendar) => {
            return (
              <TouchableOpacity
                key={calendar.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === calendar.id }}
                accessibilityLabel={"Elegir calendario " + calendar.title}
                disabled={disabled || busy || creating || loading}
                onPress={() => {
                  setSelected(calendar.id);
                }}
                style={common.input}
              >
                <Text style={common.subtitle}>
                  {selected === calendar.id ? "✓ " : ""}
                  {calendar.title}
                </Text>
              </TouchableOpacity>
            );
          })}
          {calendars.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={common.label}>Fecha y hora del teléfono</Text>
              <TextInput
                accessibilityLabel="Fecha de compra"
                placeholder="DD/MM/AAAA"
                style={common.input}
                placeholderTextColor={colors.muted}
                value={date}
                onChangeText={setDate}
                maxLength={10}
                editable={!disabled && !busy && !creating}
              />
              <TextInput
                accessibilityLabel="Hora de compra"
                placeholder="HH:MM (24 horas)"
                style={common.input}
                placeholderTextColor={colors.muted}
                value={time}
                onChangeText={setTime}
                maxLength={5}
                editable={!disabled && !busy && !creating}
              />
              <Text style={common.subtitle}>
                El evento durará 30 minutos y tendrá una alerta al inicio.
              </Text>
              <PrimaryButton
                title="Confirmar evento de compra"
                onPress={create}
                disabled={disabled || busy || creating || loading}
              />
            </View>
          )}
          <Button
            title="Cancelar evento"
            color={colors.muted}
            onPress={cancel}
            disabled={creating}
          />
        </View>
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
          title="Abrir Ajustes de calendario"
          color={colors.green}
          onPress={() => {
            return Linking.openSettings().catch(() => {
              setMessage(
                "Abrí Ajustes del teléfono para habilitar el calendario.",
              );
            });
          }}
        />
      )}
    </View>
  );
}
