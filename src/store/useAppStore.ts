import { create } from "zustand";
import { Product } from "../types";
import * as storage from "../services/storage";
import {
  cancelReminder,
  scheduleShoppingReminder,
} from "../services/notifications";
import { savePhoto, removePhoto } from "../services/photos";

type AppState = {
  username: string | null;
  products: Product[];
  busy: boolean;
  register: (u: string, p: string) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  addProduct: (name: string, quantity: number, photoUri?: string) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setProductPhoto: (id: string, uri: string | null) => Promise<void>;
  remind: () => Promise<void>;
};
export const useAppStore = create<AppState>((set, get) => {
  let reminder: string | null = null;
  async function exclusive(action: () => Promise<void>) {
    if (get().busy)
      throw new Error("Esperá a que termine la operación anterior.");
    set({ busy: true });
    try {
      await action();
    } finally {
      set({ busy: false });
    }
  }
  async function clearReminder() {
    if (reminder) {
      await cancelReminder(reminder);
      reminder = null;
    }
  }
  async function commit(next: Product[]) {
    const { username } = get();
    if (!username) throw new Error("Iniciá sesión primero.");
    await storage.saveProducts(username, next);
    set({ products: next });
    try {
      await clearReminder();
    } catch {}
  }
  return {
    username: null,
    products: [],
    busy: false,
    register: (u, p) => exclusive(() => storage.registerUser(u, p)),
    login: (u, p) =>
      exclusive(async () => {
        const user = await storage.authenticateUser(u, p);
        const saved = await storage.loadProducts(user);
        set({ products: saved, username: user });
      }),
    logout: () =>
      exclusive(async () => {
        await clearReminder();
        set({ username: null, products: [] });
      }),
    addProduct: (name, quantity, uri) =>
      exclusive(async () => {
        if (!get().username) throw new Error("Iniciá sesión primero.");
        const photo = uri ? savePhoto(uri) : undefined;
        const product: Product = {
          id: Date.now() + "-" + Math.random().toString(36).slice(2),
          name: name.trim(),
          quantity,
          bought: false,
          ...(photo ? { photo } : {}),
        };
        try {
          await commit([...get().products, product]);
        } catch (error) {
          if (photo) {
            try { removePhoto(photo); } catch {}
          }
          throw error;
        }
      }),
    toggleProduct: (id) =>
      exclusive(() =>
        commit(
          get().products.map((p) => (p.id === id ? { ...p, bought: !p.bought } : p)),
        ),
      ),
    deleteProduct: (id) =>
      exclusive(async () => {
        const product = get().products.find((p) => p.id === id);
        await commit(get().products.filter((p) => p.id !== id));
        if (product?.photo) {
          try { removePhoto(product.photo); } catch {}
        }
      }),
    setProductPhoto: (id, uri) =>
      exclusive(async () => {
        if (!get().username) throw new Error("Iniciá sesión primero.");
        const product = get().products.find((p) => p.id === id);
        if (!product) throw new Error("El producto ya no está disponible.");
        const photo = uri === null ? undefined : savePhoto(uri);
        const { photo: previous, ...rest } = product;
        const updated = photo ? { ...rest, photo } : rest;
        try {
          await commit(get().products.map((p) => p.id === id ? updated : p));
        } catch (error) {
          if (photo) {
            try { removePhoto(photo); } catch {}
          }
          throw error;
        }
        if (previous) {
          try { removePhoto(previous); } catch {}
        }
      }),
    remind: () =>
      exclusive(async () => {
        const pending = get().products.filter((p) => !p.bought).length;
        if (!pending)
          throw new Error(
            "Agregá un producto pendiente para crear un recordatorio.",
          );
        await clearReminder();
        reminder = await scheduleShoppingReminder(pending);
      }),
  };
});
