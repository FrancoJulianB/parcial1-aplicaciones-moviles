import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ProductItem from "../src/components/ProductItem";

const product = { id: "1", name: "Leche", quantity: 2, bought: false };

test("muestra el nombre y la cantidad del producto", () => {
  const view = render(
    <ProductItem
      product={product}
      onOpen={jest.fn()}
      onToggle={jest.fn()}
      onDelete={jest.fn()}
    />,
  );

  expect(view.getByText("Leche")).toBeTruthy();
  expect(view.getByText("Cantidad: 2")).toBeTruthy();
});
test("el botón eliminar ejecuta la acción correspondiente", () => {
  const onDelete = jest.fn();
  const onToggle = jest.fn();
  const view = render(
    <ProductItem
      product={product}
      onOpen={jest.fn()}
      onToggle={onToggle}
      onDelete={onDelete}
    />,
  );

  fireEvent.press(view.getByLabelText("Eliminar Leche"));
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
});
test("permite marcar como comprado y comunica su estado", () => {
  const onToggle = jest.fn();
  const view = render(
    <ProductItem
      onOpen={jest.fn()}
      product={{ ...product, bought: true }}
      onToggle={onToggle}
      onDelete={jest.fn()}
    />,
  );
  const checkbox = view.getByRole("checkbox");

  expect(checkbox.props.accessibilityState.checked).toBe(true);
  fireEvent.press(checkbox);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

jest.mock("../src/services/photos", () => {
  return {
    photoUri: (name: string) => {
      return "file:///documents/" + name;
    },
  };
});

test("abrir el detalle, marcar y eliminar ejecutan acciones independientes", () => {
  const onOpen = jest.fn();
  const onToggle = jest.fn();
  const onDelete = jest.fn();
  const view = render(
    <ProductItem
      product={{ ...product, photo: "photo.jpg" }}
      onOpen={onOpen}
      onToggle={onToggle}
      onDelete={onDelete}
    />,
  );

  expect(view.getByLabelText("Foto de Leche").props.source.uri).toBe(
    "file:///documents/photo.jpg",
  );
  fireEvent.press(view.getByLabelText("Ver detalle de Leche"));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole("checkbox"));
  fireEvent.press(view.getByLabelText("Eliminar Leche"));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onDelete).toHaveBeenCalledTimes(1);
});
