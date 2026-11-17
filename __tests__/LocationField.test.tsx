import React from "react";
import { Linking } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import LocationField from "../src/components/LocationField";
import { currentShopLocation } from "../src/services/location";

jest.mock("../src/services/location", () => {
  return {
    currentShopLocation: jest.fn(),
  };
});

beforeEach(() => {
  return jest.resetAllMocks();
});

test("no solicita permisos al montar y permite ingresar el comercio manualmente", async () => {
  const onChange = jest.fn();
  const view = render(
    <LocationField
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  expect(currentShopLocation).not.toHaveBeenCalled();
  fireEvent.changeText(
    view.getByLabelText("Nombre o dirección del comercio"),
    " Almacén ",
  );
  await act(async () => {
    fireEvent.press(view.getByText("Usar comercio manual"));
  });
  expect(onChange).toHaveBeenCalledWith({
    source: "manual",
    address: "Almacén",
  });
});

test("muestra espera, denegación y Ajustes sin sobrescribir la ubicación existente", async () => {
  const onChange = jest.fn();
  let finish!: (value: unknown) => void;

  (currentShopLocation as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const view = render(
    <LocationField
      value={{ source: "manual", address: "Tienda" }}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  fireEvent.press(view.getByText("Usar ubicación actual"));
  expect(view.getByLabelText("Obteniendo o guardando ubicación")).toBeTruthy();
  await act(async () => {
    finish({ status: "denied", canAskAgain: false });
  });
  expect(view.getByText("Comercio ingresado manualmente: Tienda")).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();

  const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();

  fireEvent.press(view.getByText("Abrir Ajustes de ubicación"));
  expect(open).toHaveBeenCalled();
  open.mockRestore();
});

test("permite reintentar después de un error y quitar coordenadas", async () => {
  const onChange = jest.fn();

  (currentShopLocation as jest.Mock)
    .mockResolvedValueOnce({ status: "unavailable" })
    .mockResolvedValueOnce({
      status: "granted",
      location: { source: "gps", latitude: 1, longitude: 2 },
    });

  const view = render(
    <LocationField
      value={{ source: "gps", latitude: 3, longitude: 4 }}
      onChange={onChange}
      onWorking={jest.fn()}
    />,
  );

  expect(view.getByText("Ubicación GPS: 3.000000, 4.000000")).toBeTruthy();
  await act(async () => {
    fireEvent.press(view.getByText("Actualizar ubicación actual"));
  });
  expect(onChange).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(view.getByText("Actualizar ubicación actual"));
  });
  expect(onChange).toHaveBeenCalledWith({
    source: "gps",
    latitude: 1,
    longitude: 2,
  });
  await act(async () => {
    fireEvent.press(view.getByText("Quitar ubicación"));
  });
  expect(onChange).toHaveBeenLastCalledWith(undefined);
});
