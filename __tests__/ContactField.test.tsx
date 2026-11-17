import React from "react";
import { Linking } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import ContactField from "../src/components/ContactField";
import { loadPhoneContacts } from "../src/services/contacts";

jest.mock("../src/services/contacts", () => {
  return { loadPhoneContacts: jest.fn() };
});

const previous = { source: "manual" as const, name: "Anterior", phone: "111" };
const choices = [
  {
    id: "1",
    contact: {
      source: "phone" as const,
      name: "Ana",
      phone: "123",
      email: "ana@example.com",
    },
  },
  { id: "2", contact: { source: "phone" as const, name: "Luis" } },
];

beforeEach(() => {
  jest.resetAllMocks();
});

test("no pide permiso al montar y permite asociar un contacto manual sin teléfono ni email", async () => {
  const onChange = jest.fn();
  const view = render(
    <ContactField
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  expect(loadPhoneContacts).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText("Nombre del contacto"), " María ");
  await act(async () => {
    fireEvent.press(view.getByText("Usar contacto manual"));
  });
  expect(onChange).toHaveBeenCalledWith({ source: "manual", name: "María" });
});

test("muestra espera, acceso limitado y búsqueda por nombre, teléfono y email", async () => {
  let finish!: (result: unknown) => void;
  const onChange = jest.fn();
  const onWorking = jest.fn();

  (loadPhoneContacts as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const view = render(
    <ContactField
      onChange={onChange}
      onWorking={onWorking}
    />,
  );

  fireEvent.press(view.getByText("Elegir contacto del teléfono"));
  expect(view.getByLabelText("Cargando contactos")).toBeTruthy();
  expect(onWorking).toHaveBeenLastCalledWith(true);
  await act(async () => {
    finish({ status: "available", limited: true, contacts: choices });
  });
  expect(view.getByText(/Acceso limitado:/)).toBeTruthy();
  for (const query of ["Ana", "123", "ana@example.com"]) {
    fireEvent.changeText(view.getByLabelText("Buscar contactos"), query);
    expect(view.getByLabelText("Elegir Ana")).toBeTruthy();
    expect(view.queryByLabelText("Elegir Luis")).toBeNull();
  }

  await act(async () => {
    fireEvent.press(view.getByLabelText("Elegir Ana"));
  });
  expect(onChange).toHaveBeenCalledWith(choices[0].contact);
  expect(onWorking).toHaveBeenLastCalledWith(false);
});

test("cancelar la selección conserva el contacto y descarta la agenda cargada", async () => {
  const onChange = jest.fn();

  (loadPhoneContacts as jest.Mock).mockResolvedValue({
    status: "available",
    limited: false,
    contacts: choices,
  });

  const view = render(
    <ContactField
      value={previous}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Reemplazar contacto"));
  });
  expect(view.getByText("Acceso concedido. Elegí un contacto.")).toBeTruthy();
  fireEvent.changeText(view.getByLabelText("Buscar contactos"), "Luis");
  fireEvent.press(view.getByText("Cancelar selección"));
  expect(onChange).not.toHaveBeenCalled();
  expect(view.getByText("Anterior")).toBeTruthy();
  expect(view.queryByLabelText("Elegir Luis")).toBeNull();
});

test("cancelar mientras carga ignora los resultados tardíos", async () => {
  let finish!: (result: unknown) => void;
  const onChange = jest.fn();

  (loadPhoneContacts as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const view = render(
    <ContactField
      value={previous}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  fireEvent.press(view.getByText("Reemplazar contacto"));
  fireEvent.press(view.getByText("Cancelar selección"));
  await act(async () => {
    finish({ status: "available", limited: false, contacts: choices });
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(view.queryByLabelText("Elegir Ana")).toBeNull();
  expect(view.getByText("Anterior")).toBeTruthy();
});

test("la denegación bloqueada ofrece Ajustes y entrada manual", async () => {
  (loadPhoneContacts as jest.Mock).mockResolvedValue({
    status: "denied",
    canAskAgain: false,
  });

  const onChange = jest.fn();
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  const view = render(
    <ContactField
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Elegir contacto del teléfono"));
  });
  expect(view.getByText(/Permiso de contactos denegado/)).toBeTruthy();
  fireEvent.press(view.getByText("Abrir Ajustes de contactos"));
  expect(openSettings).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText("Ingresar contacto manualmente"));
  fireEvent.changeText(view.getByLabelText("Nombre del contacto"), " Ana ");
  fireEvent.changeText(
    view.getByLabelText("Email del contacto"),
    " ana@example.com ",
  );
  await act(async () => {
    fireEvent.press(view.getByText("Usar contacto manual"));
  });
  expect(onChange).toHaveBeenCalledWith({
    source: "manual",
    name: "Ana",
    email: "ana@example.com",
  });
  openSettings.mockRestore();
});

test("sin contactos disponibles permite ingresar uno manualmente", async () => {
  (loadPhoneContacts as jest.Mock).mockResolvedValue({
    status: "available",
    limited: false,
    contacts: [],
  });

  const view = render(
    <ContactField
      onChange={jest.fn()}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Elegir contacto del teléfono"));
  });
  expect(
    view.getByText(
      "No hay contactos disponibles. Podés ingresar uno manualmente.",
    ),
  ).toBeTruthy();
  fireEvent.press(view.getByText("Ingresar contacto manualmente"));
  expect(view.getByLabelText("Nombre del contacto")).toBeTruthy();
});

test("un error de guardado conserva el contacto y permite reintentar", async () => {
  (loadPhoneContacts as jest.Mock).mockResolvedValue({
    status: "available",
    limited: false,
    contacts: choices,
  });

  const onChange = jest.fn().mockRejectedValueOnce(new Error("Sin espacio"));
  const view = render(
    <ContactField
      value={previous}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Reemplazar contacto"));
  });
  await act(async () => {
    fireEvent.press(view.getByLabelText("Elegir Ana"));
  });
  expect(
    view.getByText("No se pudo guardar el contacto. Intentá nuevamente."),
  ).toBeTruthy();
  await act(async () => {
    fireEvent.press(view.getByLabelText("Elegir Luis"));
  });
  expect(onChange).toHaveBeenLastCalledWith(choices[1].contact);
  expect(view.queryByLabelText("Elegir Ana")).toBeNull();
});

test("quitar el contacto utiliza onChange sin datos", async () => {
  const onChange = jest.fn();
  const view = render(
    <ContactField
      value={previous}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Quitar contacto"));
  });
  expect(onChange).toHaveBeenCalledWith(undefined);
});

test("un error de carga deja disponible la entrada manual y permite volver a intentar", async () => {
  (loadPhoneContacts as jest.Mock)
    .mockRejectedValueOnce(new Error("Error de lectura"))
    .mockResolvedValueOnce({
      status: "available",
      limited: false,
      contacts: choices,
    });

  const view = render(
    <ContactField
      onChange={jest.fn()}
      onWorking={jest.fn()}
    />,
  );

  await act(async () => {
    fireEvent.press(view.getByText("Elegir contacto del teléfono"));
  });
  expect(view.getByText(/No se pudieron cargar los contactos/)).toBeTruthy();
  fireEvent.press(view.getByText("Cancelar selección"));
  await act(async () => {
    fireEvent.press(view.getByText("Elegir contacto del teléfono"));
  });
  expect(view.getByLabelText("Elegir Ana")).toBeTruthy();
});
