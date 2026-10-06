import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ProductItem from "../src/components/ProductItem";
const product = { id: "1", name: "Leche", quantity: 2, bought: false };
test("muestra el nombre y la cantidad del producto", () => {
  const view = render(
    <ProductItem product={product} onToggle={jest.fn()} onDelete={jest.fn()} />,
  );
  expect(view.getByText("Leche")).toBeTruthy();
  expect(view.getByText("Cantidad: 2")).toBeTruthy();
});
test("el botón eliminar ejecuta la acción correspondiente", () => {
  const onDelete = jest.fn();
  const onToggle = jest.fn();
  const view = render(
    <ProductItem product={product} onToggle={onToggle} onDelete={onDelete} />,
  );
  fireEvent.press(view.getByLabelText("Eliminar Leche"));
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
});
test("permite marcar como comprado y comunica su estado", () => {
  const onToggle = jest.fn();
  const view = render(
    <ProductItem
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
