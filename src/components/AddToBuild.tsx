"use client";

import { useTranslations } from "next-intl";
import { useBuildStore } from "@/lib/build-store";
import type { Slot } from "@/lib/specs";

export function AddToBuild({ slot, id, className = "btn-ghost" }: { slot: Slot; id: number; className?: string }) {
  const t = useTranslations("product");
  const setPart = useBuildStore((s) => s.setPart);
  const added = useBuildStore((s) => (slot === "storage" ? s.selection.storage.includes(id) : s.selection[slot] === id));

  return (
    <button type="button" className={`btn ${className}`} aria-pressed={added} onClick={() => setPart(slot, id)}>
      {added ? `✓ ${t("added")}` : t("addToBuild")}
    </button>
  );
}
