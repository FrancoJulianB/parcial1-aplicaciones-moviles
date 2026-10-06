import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerUser,
  authenticateUser,
  saveProducts,
  loadProducts,
} from "../src/services/storage";
beforeEach(async () => {
  await AsyncStorage.clear();
});
test("registra un usuario, valida su contraseña y rechaza duplicados", async () => {
  await registerUser(" Franco ", "123456");
  await expect(authenticateUser("FRANCO", "123456")).resolves.toBe("franco");
  await expect(authenticateUser("franco", "incorrecta")).rejects.toThrow(
    "Usuario o contraseña incorrectos.",
  );
  await expect(registerUser("franco", "otraClave")).rejects.toThrow(
    "Ese usuario ya está registrado.",
  );
});
test("recupera productos guardados y mantiene las listas separadas", async () => {
  const products = [{ id: "1", name: "Arroz", quantity: 1, bought: false }];
  await saveProducts("franco", products);
  await expect(loadProducts("franco")).resolves.toEqual(products);
  await expect(loadProducts("abi")).resolves.toEqual([]);
  await saveProducts("franco", []);
  await expect(loadProducts("franco")).resolves.toEqual([]);
});
