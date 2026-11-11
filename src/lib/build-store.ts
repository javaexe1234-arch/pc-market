"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EMPTY_SELECTION, Selection } from "./build-selection";
import type { Slot } from "./specs";

interface BuildState {
  selection: Selection;
  hydrated: boolean;
  setPart: (slot: Slot, id: number) => void;
  removePart: (slot: Slot, id?: number) => void;
  load: (selection: Selection) => void;
  clear: () => void;
}

/**
 * Current build, kept in localStorage. Hydration is manual because the server has no
 * localStorage: rendering the saved build straight away would not match the server's HTML.
 */
export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      selection: EMPTY_SELECTION,
      hydrated: false,
      setPart: (slot, id) =>
        set(({ selection }) => ({
          selection:
            slot === "storage"
              ? { ...selection, storage: selection.storage.includes(id) ? selection.storage : [...selection.storage, id] }
              : { ...selection, [slot]: id },
        })),
      removePart: (slot, id) =>
        set(({ selection }) => {
          if (slot === "storage") return { selection: { ...selection, storage: selection.storage.filter((d) => d !== id) } };
          const next = { ...selection };
          delete next[slot];
          return { selection: next };
        }),
      load: (selection) => set({ selection }),
      clear: () => set({ selection: EMPTY_SELECTION }),
    }),
    {
      name: "pc-market-build",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ selection: state.selection }),
      onRehydrateStorage: () => () => useBuildStore.setState({ hydrated: true }),
    },
  ),
);

let hydration: Promise<void> | undefined;

/** Loads the saved build once per page load. Safe to call from any component's effect. */
export function hydrateBuildStore(): Promise<void> {
  hydration ??= Promise.resolve(useBuildStore.persist.rehydrate());
  return hydration;
}

export const selectionCount = (selection: Selection) =>
  Object.entries(selection).reduce((n, [key, value]) => n + (key === "storage" ? (value as number[]).length : 1), 0);
