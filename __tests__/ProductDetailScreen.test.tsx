import React from "react";
import { Linking } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import ProductDetailScreen from "../src/screens/ProductDetailScreen";
import { pickPhoto } from "../src/services/imagePicker";

const mockSetPhoto = jest.fn();
const mockSetLocation = jest.fn();
const mockSetContact = jest.fn();
const mockProduct = {
  id: "1",
  name: "Pan",
  quantity: 1,
  bought: false,
  photo: "existing.jpg",
};

jest.mock("../src/store/useAppStore", () => {
  return {
    useAppStore: (selector: (state: unknown) => unknown) => {
      return selector({
        products: [mockProduct],
        busy: false,
        setProductPhoto: mockSetPhoto,
        setProductLocation: mockSetLocation,
        setProductContact: mockSetContact,
      });
    },
  };
});
jest.mock("../src/services/photos", () => {
  return {
    photoUri: (name: string) => {
      return "file:///documents/" + name;
    },
  };
});
jest.mock("../src/services/imagePicker", () => {
  return { pickPhoto: jest.fn() };
});

function screen() {
  const props = { route: { params: { id: "1" } } } as React.ComponentProps<
    typeof ProductDetailScreen
  >;

  return render(<ProductDetailScreen {...props} />);
}

beforeEach(() => {
  return jest.clearAllMocks();
});

test("cancelar conserva la imagen existente y no llama a la acción del store", async () => {
  (pickPhoto as jest.Mock).mockResolvedValue({ status: "canceled" });

  const view = screen();

  await act(async () => {
    fireEvent.press(view.getByText("Elegir de la galería"));
  });
  expect(mockSetPhoto).not.toHaveBeenCalled();
  expect(view.getByLabelText("Foto de Pan").props.source.uri).toContain(
    "existing.jpg",
  );
});

test("muestra permiso pendiente, denegación y acceso a Ajustes, manteniendo disponible la galería", async () => {
  let finish!: (value: unknown) => void;

  (pickPhoto as jest.Mock).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );

  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  const view = screen();

  fireEvent.press(view.getByText("Tomar foto"));
  expect(view.getByText("Comprobando permiso de cámara…")).toBeTruthy();
  finish({ status: "denied", canAskAgain: false });
  await waitFor(() => {
    return expect(view.getByText("Abrir Ajustes")).toBeTruthy();
  });
  fireEvent.press(view.getByText("Abrir Ajustes"));
  expect(openSettings).toHaveBeenCalled();
  (pickPhoto as jest.Mock).mockResolvedValueOnce({
    status: "selected",
    uri: "cache.jpg",
  });
  fireEvent.press(view.getByText("Elegir de la galería"));
  await waitFor(() => {
    return expect(mockSetPhoto).toHaveBeenCalledWith("1", "cache.jpg");
  });
  openSettings.mockRestore();
});

test("quitar la foto usa la acción del store", async () => {
  const view = screen();

  fireEvent.press(view.getByText("Quitar foto"));
  await waitFor(() => {
    return expect(mockSetPhoto).toHaveBeenCalledWith("1", null);
  });
});

jest.mock("../src/services/location", () => {
  return {
    currentShopLocation: jest.fn(),
  };
});

test("el detalle actualiza el comercio mediante la acción del store", async () => {
  const view = screen();

  fireEvent.changeText(
    view.getByLabelText("Nombre o dirección del comercio"),
    "Tienda",
  );
  await act(async () => {
    fireEvent.press(view.getByText("Usar comercio manual"));
  });
  expect(mockSetLocation).toHaveBeenCalledWith("1", {
    source: "manual",
    address: "Tienda",
  });
});

jest.mock("../src/services/contacts", () => {
  return { loadPhoneContacts: jest.fn() };
});

test("el detalle asocia un contacto mediante la acción del store", async () => {
  const view = screen();

  fireEvent.changeText(view.getByLabelText("Nombre del contacto"), "Ana");
  await act(async () => {
    fireEvent.press(view.getByText("Usar contacto manual"));
  });
  expect(mockSetContact).toHaveBeenCalledWith("1", {
    source: "manual",
    name: "Ana",
  });
});
