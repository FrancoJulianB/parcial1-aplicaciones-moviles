import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import AddProductScreen from "../src/screens/AddProductScreen";
import { pickPhoto } from "../src/services/imagePicker";

const mockAddProduct = jest.fn();
const mockGoBack = jest.fn();
jest.mock("../src/store/useAppStore", () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ addProduct: mockAddProduct, busy: false }),
}));
jest.mock("../src/services/imagePicker", () => ({ pickPhoto: jest.fn() }));

function screen() {
  const props = { navigation: { goBack: mockGoBack } } as unknown as React.ComponentProps<typeof AddProductScreen>;
  const view = render(<AddProductScreen {...props} />);
  fireEvent.changeText(view.getByLabelText("Nombre del producto"), "Pan");
  return view;
}

beforeEach(() => jest.resetAllMocks());

test("permite guardar sin foto", async () => {
  const view = screen();
  await act(async () => { fireEvent.press(view.getByText("Guardar producto")); });
  expect(mockAddProduct).toHaveBeenCalledWith("Pan", 1, undefined);
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test("selecciona una foto, conserva la selección al cancelar y la envía al guardar", async () => {
  (pickPhoto as jest.Mock).mockResolvedValueOnce({ status: "selected", uri: "cache.jpg" })
    .mockResolvedValueOnce({ status: "canceled" });
  const view = screen();
  await act(async () => { fireEvent.press(view.getByText("Tomar foto")); });
  await act(async () => { fireEvent.press(view.getByText("Elegir de la galería")); });
  expect(view.getByLabelText("Foto del nuevo producto").props.source.uri).toBe("cache.jpg");
  expect(mockAddProduct).not.toHaveBeenCalled();
  await act(async () => { fireEvent.press(view.getByText("Guardar producto")); });
  expect(mockAddProduct).toHaveBeenCalledWith("Pan", 1, "cache.jpg");
});

test("permite reemplazar y quitar la foto antes de crear el producto", async () => {
  (pickPhoto as jest.Mock).mockResolvedValueOnce({ status: "selected", uri: "first.jpg" })
    .mockResolvedValueOnce({ status: "selected", uri: "second.jpg" });
  const view = screen();
  await act(async () => { fireEvent.press(view.getByText("Tomar foto")); });
  await act(async () => { fireEvent.press(view.getByText("Elegir de la galería")); });
  expect(view.getByLabelText("Foto del nuevo producto").props.source.uri).toBe("second.jpg");
  fireEvent.press(view.getByText("Quitar foto"));
  expect(view.queryByLabelText("Foto del nuevo producto")).toBeNull();
  await act(async () => { fireEvent.press(view.getByText("Guardar producto")); });
  expect(mockAddProduct).toHaveBeenCalledWith("Pan", 1, undefined);
});

test("un error conserva los campos y la imagen para reintentar sin salir", async () => {
  (pickPhoto as jest.Mock).mockResolvedValue({ status: "selected", uri: "cache.jpg" });
  mockAddProduct.mockRejectedValueOnce(new Error("Sin espacio"));
  const view = screen();
  await act(async () => { fireEvent.press(view.getByText("Elegir de la galería")); });
  await act(async () => { fireEvent.press(view.getByText("Guardar producto")); });
  expect(view.getByText("No se pudo guardar el producto. Intentá nuevamente.")).toBeTruthy();
  expect(view.getByLabelText("Nombre del producto").props.value).toBe("Pan");
  expect(view.getByLabelText("Foto del nuevo producto").props.source.uri).toBe("cache.jpg");
  expect(mockGoBack).not.toHaveBeenCalled();
  await act(async () => { fireEvent.press(view.getByText("Guardar producto")); });
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test("rechazar la cámara muestra Ajustes y permite seleccionar desde galería", async () => {
  (pickPhoto as jest.Mock).mockResolvedValueOnce({ status: "denied", canAskAgain: false })
    .mockResolvedValueOnce({ status: "selected", uri: "gallery.jpg" });
  const view = screen();
  await act(async () => { fireEvent.press(view.getByText("Tomar foto")); });
  expect(view.getByText("Abrir Ajustes")).toBeTruthy();
  await act(async () => { fireEvent.press(view.getByText("Elegir de la galería")); });
  expect(view.getByLabelText("Foto del nuevo producto").props.source.uri).toBe("gallery.jpg");
});
