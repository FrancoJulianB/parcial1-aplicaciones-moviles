import React, { createContext, useContext, useRef, useState } from "react";
import { Product } from "../types";
import * as storage from "../services/storage";
import {
  cancelReminder,
  scheduleShoppingReminder,
} from "../services/notifications";
type Context = {
  username: string | null;
  products: Product[];
  busy: boolean;
  register: (u: string, p: string) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  addProduct: (name: string, quantity: number) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  remind: () => Promise<void>;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const reminder = useRef<string | null>(null);
  async function exclusive(action: () => Promise<void>) {
    if (locked.current)
      throw new Error("Esperá a que termine la operación anterior.");
    locked.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function clearReminder() {
    if (reminder.current) {
      await cancelReminder(reminder.current);
      reminder.current = null;
    }
  }
  async function commit(next: Product[]) {
    if (!username) throw new Error("Iniciá sesión primero.");
    await storage.saveProducts(username, next);
    setProducts(next);
    try {
      await clearReminder();
    } catch {}
  }
  const value: Context = {
    username,
    products,
    busy,
    register: (u, p) => exclusive(() => storage.registerUser(u, p)),
    login: (u, p) =>
      exclusive(async () => {
        const user = await storage.authenticateUser(u, p);
        const saved = await storage.loadProducts(user);
        setProducts(saved);
        setUsername(user);
      }),
    logout: () =>
      exclusive(async () => {
        await clearReminder();
        setUsername(null);
        setProducts([]);
      }),
    addProduct: (name, quantity) =>
      exclusive(() =>
        commit([
          ...products,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: name.trim(),
            quantity,
            bought: false,
          },
        ]),
      ),
    toggleProduct: (id) =>
      exclusive(() =>
        commit(
          products.map((p) => (p.id === id ? { ...p, bought: !p.bought } : p)),
        ),
      ),
    deleteProduct: (id) =>
      exclusive(() => commit(products.filter((p) => p.id !== id))),
    remind: () =>
      exclusive(async () => {
        const pending = products.filter((p) => !p.bought).length;
        if (!pending)
          throw new Error(
            "Agregá un producto pendiente para crear un recordatorio.",
          );
        await clearReminder();
        reminder.current = await scheduleShoppingReminder(pending);
      }),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Falta AppProvider.");
  return value;
}
