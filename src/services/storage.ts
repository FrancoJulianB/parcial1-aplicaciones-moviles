import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "../types";
import { normalizeUsername } from "../utils/validators";
type User = { username: string; password: string };
const USERS_KEY = "@compras:usuarios";
const productKey = (username: string) =>
  `@compras:productos:${normalizeUsername(username)}`;
export async function registerUser(username: string, password: string) {
  const users: User[] = JSON.parse(
    (await AsyncStorage.getItem(USERS_KEY)) || "[]",
  );
  const normalized = normalizeUsername(username);
  if (users.some((user) => user.username === normalized))
    throw new Error("Ese usuario ya está registrado.");
  await AsyncStorage.setItem(
    USERS_KEY,
    JSON.stringify([...users, { username: normalized, password }]),
  );
}
export async function authenticateUser(username: string, password: string) {
  const users: User[] = JSON.parse(
    (await AsyncStorage.getItem(USERS_KEY)) || "[]",
  );
  const normalized = normalizeUsername(username);
  if (
    !users.some(
      (user) => user.username === normalized && user.password === password,
    )
  )
    throw new Error("Usuario o contraseña incorrectos.");
  return normalized;
}
export async function loadProducts(username: string): Promise<Product[]> {
  return JSON.parse((await AsyncStorage.getItem(productKey(username))) || "[]");
}
export async function saveProducts(username: string, products: Product[]) {
  await AsyncStorage.setItem(productKey(username), JSON.stringify(products));
}
