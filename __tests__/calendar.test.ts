import * as Calendar from "expo-calendar";
import { isRunningInExpoGo } from "expo";
import {
  createPurchaseEvent,
  loadEditableCalendars,
  parseEventDate,
  removePurchaseEvent,
  CalendarPermissionError,
} from "../src/services/calendar";

const mockCreateEvent = jest.fn();
const mockDeleteEvent = jest.fn();

jest.mock("expo", () => {
  return { isRunningInExpoGo: jest.fn() };
});
jest.mock("expo-calendar", () => {
  return {
    getCalendarPermissions: jest.fn(),
    requestCalendarPermissions: jest.fn(),
    getCalendars: jest.fn(),
    EntityTypes: { EVENT: "event" },
    ExpoCalendar: { get: jest.fn() },
    ExpoCalendarEvent: { get: jest.fn() },
  };
});

const start = new Date(2030, 0, 2, 12).toISOString();

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2030, 0, 1, 10));
  (isRunningInExpoGo as jest.Mock).mockReturnValue(false);
  (Calendar.getCalendarPermissions as jest.Mock).mockResolvedValue({
    granted: true,
  });
  (Calendar.getCalendars as jest.Mock).mockResolvedValue([
    { id: "editable", title: "Personal", allowsModifications: true },
    { id: "readonly", title: "Feriados", allowsModifications: false },
  ]);
  (Calendar.ExpoCalendar.get as jest.Mock).mockResolvedValue({
    createEvent: mockCreateEvent,
  });
  (Calendar.ExpoCalendarEvent.get as jest.Mock).mockResolvedValue({
    delete: mockDeleteEvent,
  });
  mockCreateEvent.mockResolvedValue({ id: "event-1" });
  mockDeleteEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

test("solicita permiso de calendario y devuelve solo los editables sin pedir recordatorios", async () => {
  (Calendar.getCalendarPermissions as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  (Calendar.requestCalendarPermissions as jest.Mock).mockResolvedValue({
    granted: true,
  });

  await expect(loadEditableCalendars()).resolves.toEqual({
    status: "available",
    calendars: [{ id: "editable", title: "Personal" }],
  });
  expect(Calendar.getCalendarPermissions).toHaveBeenCalledWith(false);
  expect(Calendar.requestCalendarPermissions).toHaveBeenCalledWith(false);
  expect(Calendar.getCalendars).toHaveBeenCalledWith("event");
});

test.each([true, false])(
  "respeta la denegación con canAskAgain=%s sin leer calendarios",
  async (canAskAgain) => {
    (Calendar.getCalendarPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain,
    });
    (Calendar.requestCalendarPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain,
    });

    await expect(loadEditableCalendars()).resolves.toEqual({
      status: "denied",
      canAskAgain,
    });
    expect(Calendar.getCalendars).not.toHaveBeenCalled();
  },
);

test("en Expo Go informa que falta la compilación de desarrollo sin acceder al módulo nativo", async () => {
  (isRunningInExpoGo as jest.Mock).mockReturnValue(true);

  await expect(loadEditableCalendars()).resolves.toEqual({
    status: "unavailable",
  });
  expect(Calendar.getCalendarPermissions).not.toHaveBeenCalled();
});

test("crea un evento real con título, cantidad, comercio y alerta al inicio", async () => {
  const event = await createPurchaseEvent(
    {
      id: "1",
      name: "Pan",
      quantity: 2,
      bought: false,
      location: { source: "manual", address: "Almacén" },
    },
    "editable",
    start,
  );

  expect(mockCreateEvent).toHaveBeenCalledWith({
    title: "Comprar: Pan",
    startDate: new Date(start),
    endDate: new Date(new Date(start).getTime() + 30 * 60 * 1000),
    allDay: false,
    notes: "Cantidad: 2\nComercio: Almacén",
    location: "Almacén",
    alarms: [{ relativeOffset: 0 }],
  });
  expect(event).toEqual({
    id: "event-1",
    calendarId: "editable",
    calendarTitle: "Personal",
    startDate: start,
    createdAt: new Date().toISOString(),
  });
});

test("incluye coordenadas GPS y permite productos sin comercio", async () => {
  await createPurchaseEvent(
    {
      id: "1",
      name: "Pan",
      quantity: 1,
      bought: false,
      location: { source: "gps", latitude: 1, longitude: 2 },
    },
    "editable",
    start,
  );

  expect(mockCreateEvent).toHaveBeenLastCalledWith(
    expect.objectContaining({ location: "GPS: 1, 2" }),
  );
  await createPurchaseEvent(
    { id: "1", name: "Pan", quantity: 1, bought: false },
    "editable",
    start,
  );
  expect(mockCreateEvent.mock.calls[1][0]).not.toHaveProperty("location");
  expect(mockCreateEvent.mock.calls[1][0].notes).toBe("Cantidad: 1");
});

test("rechaza fechas pasadas, permisos revocados y calendarios no editables antes de crear", async () => {
  const product = { id: "1", name: "Pan", quantity: 1, bought: false };

  await expect(
    createPurchaseEvent(product, "editable", "2000-01-01"),
  ).rejects.toThrow("futuras");
  await expect(createPurchaseEvent(product, "readonly", start)).rejects.toThrow(
    "no permite editar",
  );

  (Calendar.getCalendarPermissions as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: false,
  });

  await expect(
    createPurchaseEvent(product, "editable", start),
  ).rejects.toBeInstanceOf(CalendarPermissionError);
  expect(mockCreateEvent).not.toHaveBeenCalled();
});

test("revalida la fecha si quedó en el pasado durante la solicitud de permisos", async () => {
  (Calendar.requestCalendarPermissions as jest.Mock).mockImplementation(
    async () => {
      jest.setSystemTime(new Date(2031, 0, 1));

      return { granted: true };
    },
  );
  (Calendar.getCalendarPermissions as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });

  await expect(
    createPurchaseEvent(
      { id: "1", name: "Pan", quantity: 1, bought: false },
      "editable",
      start,
    ),
  ).rejects.toThrow("futuras");
  expect(mockCreateEvent).not.toHaveBeenCalled();
});

test("elimina un evento recién creado para revertir un guardado fallido", async () => {
  await removePurchaseEvent("event-1");

  expect(Calendar.ExpoCalendarEvent.get).toHaveBeenCalledWith("event-1");
  expect(mockDeleteEvent).toHaveBeenCalledTimes(1);
});

test("valida estrictamente fecha, hora y que sean futuras", () => {
  expect(parseEventDate("02/01/2030", "12:30")).toEqual(
    new Date(2030, 0, 2, 12, 30),
  );
  for (const [date, time] of [
    ["31/02/2030", "12:00"],
    ["02/01/2030", "24:00"],
    ["02/01/2030", "12:60"],
    ["01/01/2000", "12:00"],
    ["2030-01-02", "12:00"],
    ["02/01/2030", "abc"],
  ]) {
    expect(parseEventDate(date, time)).toBeUndefined();
  }
});
