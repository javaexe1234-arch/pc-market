import type { Build } from "./compatibility";
import { Part, Slot, SLOTS } from "./specs";

/** The ids chosen in the builder: what gets stored and shared. */
export type Selection = Partial<Record<Exclude<Slot, "storage">, number>> & { storage: number[] };

export const EMPTY_SELECTION: Selection = { storage: [] };

export function resolveBuild(selection: Selection, parts: Part[]): Build {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const build: Build = { storage: [] };
  for (const slot of SLOTS) {
    if (slot === "storage") continue;
    const part = selection[slot] !== undefined ? byId.get(selection[slot]) : undefined;
    if (part?.slot === slot) Object.assign(build, { [slot]: part });
  }
  build.storage = selection.storage
    .map((id) => byId.get(id))
    .filter((p): p is Part<"storage"> => p?.slot === "storage");
  return build;
}

export function selectionToQuery(selection: Selection): string {
  const params = new URLSearchParams();
  for (const slot of SLOTS) {
    if (slot === "storage") continue;
    const id = selection[slot];
    if (id !== undefined) params.set(slot, String(id));
  }
  if (selection.storage.length) params.set("storage", selection.storage.join(","));
  return params.toString();
}

/** Reads a shared link. Returns null when the query holds no build at all. */
export function selectionFromQuery(query: string): Selection | null {
  const params = new URLSearchParams(query);
  const selection: Selection = { storage: [] };
  let found = false;
  const toId = (value: string) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  };
  for (const slot of SLOTS) {
    const value = params.get(slot);
    if (value === null) continue;
    if (slot === "storage") {
      selection.storage = value.split(",").map(toId).filter((id): id is number => id !== undefined);
      found ||= selection.storage.length > 0;
    } else {
      const id = toId(value);
      if (id !== undefined) {
        selection[slot] = id;
        found = true;
      }
    }
  }
  return found ? selection : null;
}
