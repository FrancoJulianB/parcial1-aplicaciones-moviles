import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppStore } from "../src/store/useAppStore";
import {
  cancelReminder,
  scheduleShoppingReminder,
} from "../src/services/notifications";

jest.mock("../src/services/notifications", () => ({
  cancelReminder: jest.fn().mockResolvedValue(undefined),
  scheduleShoppingReminder: jest.fn().mockResolvedValue("reminder-1"),
}));

const products = [{ id: "1", name: "Arroz", quantity: 2, bought: false }];

beforeEach(async () => {
  jest.restoreAllMocks();
  await useAppStore.getState().logout();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    "@compras:usuarios",
    JSON.stringify([
      { username: "franco", password: "123456" },
      { username: "abi", password: "abcdef" },
    ]),
  );
  await AsyncStorage.setItem("@compras:productos:franco", JSON.stringify(products));
});

test("carga usuarios y productos existentes con sus claves y formatos originales", async () => {
  await useAppStore.getState().login(" FRANCO ", "123456");
  expect(useAppStore.getState()).toMatchObject({
    username: "franco",
    products,
    busy: false,
  });
  await useAppStore.getState().toggleProduct("1");
  expect(JSON.parse((await AsyncStorage.getItem("@compras:productos:franco"))!))
    .toEqual([{ ...products[0], bought: true }]);
});

test("mantiene las listas aisladas al cerrar sesión y cambiar de usuario", async () => {
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().logout();
  expect(useAppStore.getState()).toMatchObject({ username: null, products: [] });
  await useAppStore.getState().login("abi", "abcdef");
  expect(useAppStore.getState().products).toEqual([]);
  await useAppStore.getState().addProduct(" Pan ", 1);
  expect(useAppStore.getState().products).toEqual([
    expect.objectContaining({ name: "Pan", quantity: 1, bought: false }),
  ]);
  await useAppStore.getState().logout();
  await useAppStore.getState().login("franco", "123456");
  expect(useAppStore.getState().products).toEqual(products);
  expect(JSON.parse((await AsyncStorage.getItem("@compras:productos:abi"))!))
    .toEqual([expect.objectContaining({ name: "Pan" })]);
});

test.each(["addProduct", "toggleProduct", "deleteProduct"] as const)(
  "un error al guardar con %s conserva los productos en memoria",
  async (action) => {
    await useAppStore.getState().login("franco", "123456");
    const previous = useAppStore.getState().products;
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Sin espacio"));
    const operation = action === "addProduct"
      ? useAppStore.getState().addProduct("Pan", 1)
      : useAppStore.getState()[action]("1");
    await expect(operation).rejects.toThrow("Sin espacio");
    expect(useAppStore.getState().products).toBe(previous);
    expect(useAppStore.getState().busy).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem("@compras:productos:franco"))!))
      .toEqual(products);
  },
);

test("actualiza la memoria después de guardar y bloquea operaciones simultáneas", async () => {
  await useAppStore.getState().login("franco", "123456");
  let finish!: () => void;
  jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(
    () => new Promise<void>((resolve) => { finish = resolve; }),
  );
  const saving = useAppStore.getState().toggleProduct("1");
  expect(useAppStore.getState().products).toEqual(products);
  expect(useAppStore.getState().busy).toBe(true);
  await expect(useAppStore.getState().deleteProduct("1")).rejects.toThrow(
    "Esperá a que termine la operación anterior.",
  );
  finish();
  await saving;
  expect(useAppStore.getState().products[0].bought).toBe(true);
  expect(useAppStore.getState().busy).toBe(false);
});

test("rechaza credenciales incorrectas sin abrir una sesión", async () => {
  await expect(useAppStore.getState().login("franco", "incorrecta")).rejects.toThrow(
    "Usuario o contraseña incorrectos.",
  );
  expect(useAppStore.getState()).toMatchObject({
    username: null, products: [], busy: false,
  });
});

test("reemplaza el recordatorio y lo cancela al modificar la lista y cerrar sesión", async () => {
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().remind();
  expect(scheduleShoppingReminder).toHaveBeenCalledWith(1);
  await useAppStore.getState().remind();
  expect(cancelReminder).toHaveBeenCalledTimes(1);
  await useAppStore.getState().addProduct("Pan", 1);
  expect(cancelReminder).toHaveBeenCalledTimes(2);
  await useAppStore.getState().remind();
  await useAppStore.getState().logout();
  expect(cancelReminder).toHaveBeenCalledTimes(3);
  expect(cancelReminder).toHaveBeenLastCalledWith("reminder-1");
});

test("un error de guardado conserva el recordatorio pendiente", async () => {
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().remind();
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Sin espacio"));
  await expect(useAppStore.getState().deleteProduct("1")).rejects.toThrow("Sin espacio");
  expect(cancelReminder).not.toHaveBeenCalled();
});

test("no programa recordatorios sin productos pendientes", async () => {
  await useAppStore.getState().login("abi", "abcdef");
  await expect(useAppStore.getState().remind()).rejects.toThrow(
    "Agregá un producto pendiente para crear un recordatorio.",
  );
  expect(scheduleShoppingReminder).not.toHaveBeenCalled();
});

jest.mock("../src/services/photos", () => ({
  savePhoto: jest.fn().mockReturnValue("new.jpg"),
  removePhoto: jest.fn(),
}));

test("persiste la foto y la recupera al volver a ingresar", async () => {
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().setProductPhoto("1", "file:///cache/image.jpg");
  await useAppStore.getState().logout();
  await useAppStore.getState().login("franco", "123456");
  expect(useAppStore.getState().products[0].photo).toBe("new.jpg");
  await useAppStore.getState().setProductPhoto("1", null);
  expect(useAppStore.getState().products[0].photo).toBeUndefined();
  expect(require("../src/services/photos").removePhoto).toHaveBeenCalledWith("new.jpg");
});

test("un error al reemplazar la foto conserva la anterior y borra la copia nueva", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().setProductPhoto("1", "file:///cache/first.jpg");
  photos.savePhoto.mockReturnValueOnce("replacement.jpg");
  photos.removePhoto.mockClear();
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Sin espacio"));
  await expect(useAppStore.getState().setProductPhoto("1", "file:///cache/second.jpg"))
    .rejects.toThrow("Sin espacio");
  expect(useAppStore.getState().products[0].photo).toBe("new.jpg");
  expect(photos.removePhoto).toHaveBeenCalledWith("replacement.jpg");
  expect(photos.removePhoto).not.toHaveBeenCalledWith("new.jpg");
});

test("un error al copiar no modifica la lista ni elimina la foto anterior", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  const previous = useAppStore.getState().products;
  photos.savePhoto.mockImplementationOnce(() => { throw new Error("Error de copia"); });
  await expect(useAppStore.getState().setProductPhoto("1", "file:///cache/photo.jpg"))
    .rejects.toThrow("Error de copia");
  expect(useAppStore.getState().products).toBe(previous);
  expect(useAppStore.getState().busy).toBe(false);
});

test("elimina el archivo solo después de guardar la eliminación del producto", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().setProductPhoto("1", "file:///cache/photo.jpg");
  photos.removePhoto.mockClear();
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Sin espacio"));
  await expect(useAppStore.getState().deleteProduct("1")).rejects.toThrow();
  expect(photos.removePhoto).not.toHaveBeenCalled();
  await useAppStore.getState().deleteProduct("1");
  expect(photos.removePhoto).toHaveBeenCalledWith("new.jpg");
});

test("crea el producto con foto persistente y la recupera al iniciar sesión", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  await useAppStore.getState().addProduct(" Pan ", 2, "file:///cache/pan.jpg");
  expect(photos.savePhoto).toHaveBeenCalledWith("file:///cache/pan.jpg");
  await useAppStore.getState().logout();
  await useAppStore.getState().login("franco", "123456");
  expect(useAppStore.getState().products[1]).toMatchObject({
    name: "Pan", quantity: 2, bought: false, photo: "new.jpg",
  });
});

test("si falla el alta con foto elimina la copia y no agrega el producto", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  const previous = useAppStore.getState().products;
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Sin espacio"));
  await expect(useAppStore.getState().addProduct("Pan", 1, "file:///cache/pan.jpg"))
    .rejects.toThrow("Sin espacio");
  expect(useAppStore.getState().products).toBe(previous);
  expect(photos.removePhoto).toHaveBeenCalledWith("new.jpg");
  expect(useAppStore.getState().busy).toBe(false);
});

test("si falla la copia durante el alta no se crea el producto", async () => {
  const photos = require("../src/services/photos");
  await useAppStore.getState().login("franco", "123456");
  const previous = useAppStore.getState().products;
  photos.savePhoto.mockImplementationOnce(() => { throw new Error("Error de copia"); });
  await expect(useAppStore.getState().addProduct("Pan", 1, "file:///cache/pan.jpg"))
    .rejects.toThrow("Error de copia");
  expect(useAppStore.getState().products).toBe(previous);
  expect(useAppStore.getState().busy).toBe(false);
});
