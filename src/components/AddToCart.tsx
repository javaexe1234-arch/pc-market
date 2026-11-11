"use client";

import { useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart-store";

export function AddToCart({ id, inStock }: { id: number; inStock: boolean }) {
  const t = useTranslations("product");
  const add = useCartStore((s) => s.add);
  const quantity = useCartStore((s) => s.lines[id] ?? 0);

  return (
    <button type="button" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!inStock} onClick={() => add(id)}>
      {!inStock ? t("outOfStock") : quantity > 0 ? t("inCart", { count: quantity }) : t("addToCart")}
    </button>
  );
}
