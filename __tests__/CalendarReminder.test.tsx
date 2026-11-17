import React from "react";
import { Linking } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import CalendarReminder from "../src/components/CalendarReminder";
import { loadEditableCalendars } from "../src/services/calendar";
import { Product } from "../src/types";

let mockProduct: Product;
const mockCreateProductEvent = jest.fn();

jest.mock("../src/store/useAppStore", () => {
  return {
    useAppStore: (selector: (state: unknown) => unknown) => {
      return selector({
        products: [mockProduct],
        busy: false,
        createProductEvent: mockCreateProductEvent,
      });
    },
  };
});
jest.mock("../src/services/calendar", () => {
  return {
    ...jest.requireActual("../src/services/calendar"),
    loadEditableCalendars: jest.fn(),
  };
});

function screen() {
  return render(
    <CalendarReminder
      productId="1"
      onWorking={jest.fn()}
    />,
  );
}

async function prepare(view: ReturnType<typeof screen>) {
  await act(async () => {
    fireEvent.press(view.getByText("Crear evento de compra"));
  });
}

function fill(view: ReturnType<typeof screen>) {
  fireEvent.press(view.getByLabelText("Elegir calendario Personal"));
  fireEvent.changeText(view.getByLabelText("Fecha de compra"), "01/01/2099");
  fireEvent.changeText(view.getByLabelText("Hora de compra"), "12:30");
}

beforeEach(() => {
  jest.resetAllMocks();
  mockProduct = { id: "1", name: "Pan", quantity: 1, bought: false };
  (loadEditableCalendars as jest.Mock).mockResolvedValue({
    status: "available",
    calendars: [{ id: "personal", title: "Personal" }],
  });
});

test("no pide permisos al montar y cancelar no crea ni modifica un evento", async () => {
  const view = screen();

  expect(loadEditableCalendars).not.toHaveBeenCalled();
  await prepare(view);
  fill(view);
  fireEvent.press(view.getByText("Cancelar evento"));
  expect(mockCreateProductEvent).not.toHaveBeenCalled();
  expect(mockProduct.calendarEvent).toBeUndefined();
  expect(view.queryByLabelText("Fecha de compra")).toBeNull();
});

test("muestra espera y al denegar el permiso ofrece acceso a Ajustes", async () => {
  let finish!: (result: unknown) => void;

  (loadEditableCalendars as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const view = screen();

  fireEvent.press(view.getByText("Crear evento de compra"));
  expect(view.getByLabelText("Procesando calendario")).toBeTruthy();
  await act(async () => {
    finish({ status: "denied", canAskAgain: false });
  });

  const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();

  fireEvent.press(view.getByText("Abrir Ajustes de calendario"));
  expect(open).toHaveBeenCalled();
  expect(mockCreateProductEvent).not.toHaveBeenCalled();
  open.mockRestore();
});

test("cancelar durante la espera descarta resultados tardíos", async () => {
  let finish!: (result: unknown) => void;

  (loadEditableCalendars as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const view = screen();

  fireEvent.press(view.getByText("Crear evento de compra"));
  fireEvent.press(view.getByText("Cancelar evento"));
  await act(async () => {
    finish({
      status: "available",
      calendars: [{ id: "personal", title: "Personal" }],
    });
  });
  expect(view.queryByLabelText("Elegir calendario Personal")).toBeNull();
  expect(mockCreateProductEvent).not.toHaveBeenCalled();
});

test("informa cuando no hay calendarios editables o se usa Expo Go", async () => {
  (loadEditableCalendars as jest.Mock)
    .mockResolvedValueOnce({ status: "available", calendars: [] })
    .mockResolvedValueOnce({ status: "unavailable" });

  const view = screen();

  await prepare(view);
  expect(view.getByText(/No hay calendarios editables/)).toBeTruthy();
  await act(async () => {
    fireEvent.press(view.getByText("Volver a cargar calendarios"));
  });
  expect(view.getByText(/requiere una compilación de desarrollo/)).toBeTruthy();
  expect(mockCreateProductEvent).not.toHaveBeenCalled();
});

test("rechaza fecha pasada y falta de calendario sin invocar la acción", async () => {
  const view = screen();

  await prepare(view);
  fireEvent.changeText(view.getByLabelText("Fecha de compra"), "01/01/2000");
  fireEvent.changeText(view.getByLabelText("Hora de compra"), "12:30");
  await act(async () => {
    fireEvent.press(view.getByText("Confirmar evento de compra"));
  });
  expect(view.getByText(/Ingresá una fecha válida/)).toBeTruthy();
  fireEvent.changeText(view.getByLabelText("Fecha de compra"), "01/01/2099");
  await act(async () => {
    fireEvent.press(view.getByText("Confirmar evento de compra"));
  });
  expect(view.getByText("Elegí un calendario editable.")).toBeTruthy();
  expect(mockCreateProductEvent).not.toHaveBeenCalled();
});

test("crea con fecha local y bloquea pulsaciones repetidas", async () => {
  let finish!: () => void;

  mockCreateProductEvent.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );

  const view = screen();

  await prepare(view);
  fill(view);
  fireEvent.press(view.getByText("Confirmar evento de compra"));
  fireEvent.press(view.getByText("Confirmar evento de compra"));
  expect(mockCreateProductEvent).toHaveBeenCalledTimes(1);
  expect(mockCreateProductEvent).toHaveBeenCalledWith(
    "1",
    "personal",
    new Date(2099, 0, 1, 12, 30).toISOString(),
  );
  await act(async () => {
    finish();
  });
  expect(view.getByText("Evento de compra creado.")).toBeTruthy();
});

test("si la creación falla conserva el formulario para reintentar", async () => {
  mockCreateProductEvent.mockRejectedValueOnce(new Error("Sin espacio"));

  const view = screen();

  await prepare(view);
  fill(view);
  await act(async () => {
    fireEvent.press(view.getByText("Confirmar evento de compra"));
  });
  expect(view.getByText("Sin espacio")).toBeTruthy();
  expect(view.getByLabelText("Fecha de compra").props.value).toBe("01/01/2099");
  expect(mockProduct.calendarEvent).toBeUndefined();
  await act(async () => {
    fireEvent.press(view.getByText("Confirmar evento de compra"));
  });
  expect(mockCreateProductEvent).toHaveBeenCalledTimes(2);
});

test("muestra el recordatorio asociado con fecha y calendario y evita ofrecer otro evento", () => {
  mockProduct.calendarEvent = {
    id: "event-1",
    calendarId: "personal",
    calendarTitle: "Personal",
    startDate: new Date(2099, 0, 1, 12).toISOString(),
    createdAt: new Date(2030, 0, 1, 12).toISOString(),
  };

  const view = screen();

  expect(
    view.getByText("Este producto ya tiene un evento de calendario asociado."),
  ).toBeTruthy();
  expect(view.getByText("Calendario: Personal")).toBeTruthy();
  expect(view.getByText(/Creado el:/)).toBeTruthy();
  expect(view.queryByText("Crear evento de compra")).toBeNull();
  expect(loadEditableCalendars).not.toHaveBeenCalled();
});
