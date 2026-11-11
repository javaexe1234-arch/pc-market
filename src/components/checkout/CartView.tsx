"use client";

import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatUzs } from "@/lib/format";
import { keySpecs } from "@/lib/part-format";
import { FieldErrors, MAX_LINE_QUANTITY } from "@/lib/order-validation";
import type { Part } from "@/lib/specs";
import { PartIcon } from "../PartIcon";
import { useSpecTranslators } from "../useFormatters";

const FIELD_NAMES = ["customerName", "phone", "address", "comment"] as const;

export function CartView({ parts }: { parts: Part[] }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const specT = useSpecTranslators();
  const { lines, hydrated, setQuantity, remove, clear } = useCartStore();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  const byId = new Map(parts.map((part) => [part.id, part]));
  const entries = Object.entries(lines).map(([id, quantity]) => ({ id: Number(id), quantity, part: byId.get(Number(id)) }));
  const known = entries.filter((entry): entry is typeof entry & { part: Part } => !!entry.part);
  const total = known.reduce((sum, { part, quantity }) => sum + part.priceUzs * quantity, 0);
  const hasShortage = known.some(({ part, quantity }) => quantity > part.stock) || entries.length !== known.length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    setUnavailable([]);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(FIELD_NAMES.map((name) => [name, form.get(name)])),
          locale,
          lines: known.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setPlaced(true);
        clear();
        router.push(`/order/${data.token}`);
        return;
      }
      if (data.error === "invalidFields") setErrors(data.fields ?? {});
      else if (data.error === "unavailable") setUnavailable(data.productIds ?? []);
      else setFormError(data.error === "tooManyRequests" ? "tooManyRequests" : "generic");
    } catch {
      setFormError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || placed) return <p className="text-muted">{t("loading")}</p>;

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-10 text-center">
        <p className="text-lg font-semibold">{t("empty")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/catalog" className="btn btn-primary">{t("toCatalog")}</Link>
          <Link href="/builder" className="btn btn-ghost">{t("toBuilder")}</Link>
        </div>
      </div>
    );
  }

  const fieldError = (name: (typeof FIELD_NAMES)[number]) => {
    const code = errors[name];
    return code ? <p id={`${name}-error`} className="mt-1 text-xs font-normal text-danger">{t(`error_${name}_${code}` as never)}</p> : null;
  };
  const fieldProps = (name: (typeof FIELD_NAMES)[number]) => ({
    name,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: `field mt-2 font-normal ${errors[name] ? "!border-danger" : ""}`,
  });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <ul className="space-y-2">
        {entries.map(({ id, quantity, part }) => {
          if (!part) {
            return (
              <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-danger bg-panel p-4 text-sm">
                <span>{t("noLongerSold")}</span>
                <button type="button" className="btn btn-ghost" onClick={() => remove(id)}>{t("remove")}</button>
              </li>
            );
          }
          const short = quantity > part.stock || unavailable.includes(id);
          return (
            <li key={id} data-cart-line={part.slug} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-panel p-4 ${short ? "border-danger" : "border-line"}`}>
              <PartIcon slot={part.slot} className="h-10 w-10 shrink-0 text-muted" />
              <div className="min-w-0 flex-1 basis-48">
                <Link href={`/product/${part.slug}`} className="font-semibold hover:text-signal">{part.brand} {part.name}</Link>
                <p className="font-mono text-xs text-muted">{keySpecs(part, specT)}</p>
                {short && (
                  <p className="mt-1 text-xs text-danger">
                    {part.stock > 0 ? t("onlyLeft", { count: part.stock }) : t("outOfStock")}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="sr-only">{t("quantity")}</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_LINE_QUANTITY}
                  value={quantity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 1) setQuantity(id, value);
                  }}
                  className="field !w-20 text-center"
                />
              </label>
              <span className="min-w-32 text-right font-mono font-semibold">{formatUzs(part.priceUzs * quantity, locale)}</span>
              <button type="button" aria-label={`${t("remove")}: ${part.name}`} className="rounded p-1 text-muted hover:text-danger" onClick={() => remove(id)}>✕</button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-line bg-panel p-5 lg:sticky lg:top-20">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted">{t("total")}</span>
          <span className="font-mono text-xl font-semibold" data-testid="cart-total">{formatUzs(total, locale)}</span>
        </div>
        <label className="block border-t border-line pt-4 text-sm font-semibold">
          {t("name")}
          <input {...fieldProps("customerName")} autoComplete="name" required maxLength={100} />
          {fieldError("customerName")}
        </label>
        <label className="block text-sm font-semibold">
          {t("phone")}
          <input {...fieldProps("phone")} type="tel" autoComplete="tel" required placeholder="+998 90 123 45 67" />
          {fieldError("phone")}
        </label>
        <label className="block text-sm font-semibold">
          {t("address")}
          <textarea {...fieldProps("address")} autoComplete="street-address" required rows={2} maxLength={300} />
          {fieldError("address")}
        </label>
        <label className="block text-sm font-semibold">
          {t("comment")}
          <textarea {...fieldProps("comment")} rows={2} maxLength={500} />
          {fieldError("comment")}
        </label>
        {(formError || unavailable.length > 0) && (
          <p role="alert" className="text-sm text-danger">
            {unavailable.length > 0 ? t("someUnavailable") : t(formError === "tooManyRequests" ? "tooManyRequests" : "genericError")}
          </p>
        )}
        <button type="submit" disabled={submitting || hasShortage} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? t("placing") : t("placeOrder")}
        </button>
        <p className="text-xs text-muted">{t("nextStep")}</p>
      </form>
    </div>
  );
}
