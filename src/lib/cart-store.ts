"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_LINE_QUANTITY } from "./order-validation";

/** productId → quantity */
type CartLines = Record<number, number>;

interface CartState {
  lines: CartLines;
  hydrated: boolean;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const clampQuantity = (quantity: number) => Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));

/** Kept in localStorage and hydrated manually, for the same reason as the build store. */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: {},
      hydrated: false,
      add: (productId, quantity = 1) =>
        set(({ lines }) => ({ lines: { ...lines, [productId]: clampQuantity((lines[productId] ?? 0) + quantity) } })),
      setQuantity: (productId, quantity) =>
        set(({ lines }) => ({ lines: { ...lines, [productId]: clampQuantity(quantity) } })),
      remove: (productId) =>
        set(({ lines }) => {
          const next = { ...lines };
          delete next[productId];
          return { lines: next };
        }),
      clear: () => set({ lines: {} }),
    }),
    {
      name: "pc-market-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => () => useCartStore.setState({ hydrated: true }),
    },
  ),
);

let hydration: Promise<void> | undefined;

export function hydrateCartStore(): Promise<void> {
  hydration ??= Promise.resolve(useCartStore.persist.rehydrate());
  return hydration;
}

export const cartCount = (lines: CartLines) => Object.values(lines).reduce((sum, quantity) => sum + quantity, 0);
