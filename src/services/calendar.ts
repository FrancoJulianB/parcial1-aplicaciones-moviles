import { isRunningInExpoGo } from "expo";
import { Product, ProductCalendarEvent } from "../types";

export type EditableCalendar = {
  id: string;
  title: string;
};

export type CalendarsResult =
  | { status: "available"; calendars: EditableCalendar[] }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "unavailable" };

export class CalendarPermissionError extends Error {
  canAskAgain: boolean;

  constructor(canAskAgain: boolean) {
    super(
      "No hay permiso para crear el evento. Revisá el acceso al calendario en Ajustes.",
    );
    this.canAskAgain = canAskAgain;
  }
}

async function calendarModule() {
  if (isRunningInExpoGo()) {
    throw new Error(
      "El calendario requiere una compilación de desarrollo. No está disponible en Expo Go.",
    );
  }

  try {
    return require("expo-calendar") as typeof import("expo-calendar");
  } catch {
    throw new Error(
      "El calendario no está disponible. Instalá una compilación de desarrollo con expo-calendar.",
    );
  }
}

export function parseEventDate(date: string, time: string): Date | undefined {
  const dateParts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const timeParts = /^(\d{2}):(\d{2})$/.exec(time.trim());

  if (!dateParts || !timeParts) {
    return undefined;
  }

  const day = Number(dateParts[1]);
  const month = Number(dateParts[2]) - 1;
  const year = Number(dateParts[3]);
  const hour = Number(timeParts[1]);
  const minute = Number(timeParts[2]);
  const value = new Date(year, month, day, hour, minute);

  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute ||
    value.getTime() <= Date.now()
  ) {
    return undefined;
  }

  return value;
}

export async function loadEditableCalendars(): Promise<CalendarsResult> {
  if (isRunningInExpoGo()) {
    return { status: "unavailable" };
  }

  const calendar = await calendarModule();
  let permission = await calendar.getCalendarPermissions(false);

  if (!permission.granted && permission.canAskAgain) {
    permission = await calendar.requestCalendarPermissions(false);
  }

  if (!permission.granted) {
    return { status: "denied", canAskAgain: permission.canAskAgain };
  }

  const calendars = await calendar.getCalendars(calendar.EntityTypes.EVENT);

  return {
    status: "available",
    calendars: calendars
      .filter((item) => {
        return item.allowsModifications;
      })
      .map((item) => {
        return { id: item.id, title: item.title };
      }),
  };
}

export async function createPurchaseEvent(
  product: Product,
  calendarId: string,
  startDate: string,
): Promise<ProductCalendarEvent> {
  const date = new Date(startDate);

  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new Error("Elegí una fecha y hora futuras.");
  }

  const result = await loadEditableCalendars();

  if (result.status === "denied") {
    throw new CalendarPermissionError(result.canAskAgain);
  }

  if (result.status === "unavailable") {
    throw new Error(
      "El calendario requiere una compilación de desarrollo. No está disponible en Expo Go.",
    );
  }

  const selected = result.calendars.find((item) => {
    return item.id === calendarId;
  });

  if (!selected) {
    throw new Error(
      "El calendario elegido ya no está disponible o no permite editar eventos.",
    );
  }

  const calendar = await calendarModule();
  const destination = await calendar.ExpoCalendar.get(calendarId);
  const shop =
    product.location?.source === "manual"
      ? product.location.address
      : product.location?.source === "gps"
        ? "GPS: " +
          product.location.latitude +
          ", " +
          product.location.longitude
        : undefined;

  if (date.getTime() <= Date.now()) {
    throw new Error("Elegí una fecha y hora futuras.");
  }

  const event = await destination.createEvent({
    title: "Comprar: " + product.name,
    startDate: date,
    endDate: new Date(date.getTime() + 30 * 60 * 1000),
    allDay: false,
    notes:
      "Cantidad: " + product.quantity + (shop ? "\nComercio: " + shop : ""),
    ...(shop ? { location: shop } : {}),
    alarms: [{ relativeOffset: 0 }],
  });

  return {
    id: event.id,
    calendarId: selected.id,
    calendarTitle: selected.title,
    startDate: date.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function removePurchaseEvent(id: string) {
  const calendar = await calendarModule();
  const event = await calendar.ExpoCalendarEvent.get(id);

  await event.delete();
}
