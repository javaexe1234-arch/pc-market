"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useBuildStore } from "@/lib/build-store";
import { useCartStore } from "@/lib/cart-store";
import { Build, estimateLoadW, Issue } from "@/lib/compatibility";
import { formatUzs } from "@/lib/format";
import type { Part, Slot } from "@/lib/specs";

const STATUS_STYLE = {
  statusEmpty: "text-muted",
  statusIncomplete: "text-muted",
  statusErrors: "text-danger",
  statusWarnings: "text-warn",
  statusOk: "text-good",
} as const;

export function Summary({ build, issues }: { build: Build; issues: Issue[] }) {
  const t = useTranslations("builder");
  const tCompat = useTranslations("compat");
  const tSlots = useTranslations("slots");
  const locale = useLocale();
  const clear = useBuildStore((s) => s.clear);
  const addToCart = useCartStore((s) => s.add);
  const [copied, setCopied] = useState(false);
  const [addedKey, setAddedKey] = useState<string | null>(null);

  const singles = [build.cpu, build.motherboard, build.ram, build.gpu, build.psu, build.cooler, build.case];
  const chosen = [...singles, ...build.storage].filter(Boolean) as Part[];
  const total = chosen.reduce((sum, part) => sum + part.priceUzs, 0);
  const load = estimateLoadW(build);

  const missing = issues.filter((i) => i.code === "missing").map((i) => i.params?.slot as Slot);
  const errors = issues.filter((i) => i.level === "error" && i.code !== "missing");
  const warnings = issues.filter((i) => i.level === "warning");

  const status =
    chosen.length === 0 ? "statusEmpty"
    : errors.length > 0 ? "statusErrors"
    : missing.length > 0 ? "statusIncomplete"
    : warnings.length > 0 ? "statusWarnings"
    : "statusOk";

  // Only a complete build with no conflicts can go to the cart in one click.
  const purchasable = chosen.length > 0 && errors.length === 0 && missing.length === 0;
  const buildKey = chosen.map((part) => part.id).join();

  function addBuildToCart() {
    chosen.forEach((part) => addToCart(part.id));
    setAddedKey(buildKey);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <aside className="rounded-xl border border-line bg-panel p-5" aria-label={t("summary")}>
      <p className={`font-bold ${STATUS_STYLE[status]}`} role="status" data-testid="build-status">{t(status)}</p>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">{t("total")}</dt>
          <dd className="font-mono text-lg font-semibold">{formatUzs(total, locale)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">{t("load")}</dt>
          <dd className="font-mono">
            {build.psu && load > 0 ? t("psuValue", { load, psu: build.psu.specs.watts }) : load > 0 ? t("loadValue", { load }) : "—"}
          </dd>
        </div>
      </dl>

      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          {errors.map((issue) => (
            <li key={issue.code} className="flex gap-2 text-danger">
              <span aria-hidden="true">✕</span>
              <span>{tCompat(issue.code as never, issue.params as never)}</span>
            </li>
          ))}
          {warnings.map((issue) => (
            <li key={issue.code} className="flex gap-2 text-warn">
              <span aria-hidden="true">!</span>
              <span>{tCompat(issue.code as never, issue.params as never)}</span>
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && chosen.length > 0 && (
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          {t("remaining", { slots: missing.map((slot) => tSlots(slot)).join(", ") })}
        </p>
      )}

      {purchasable && (
        <div className="mt-4 border-t border-line pt-4">
          {addedKey === buildKey ? (
            <Link href="/cart" className="btn btn-ghost w-full" data-testid="build-in-cart">✓ {t("buildAdded")}</Link>
          ) : (
            <button type="button" className="btn btn-primary w-full" onClick={addBuildToCart} data-testid="add-build-to-cart">{t("addBuildToCart")}</button>
          )}
        </div>
      )}

      {chosen.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <button type="button" className="btn btn-ghost flex-1" onClick={copyLink}>
            {copied ? t("copied") : t("copyLink")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={clear}>{t("clear")}</button>
        </div>
      )}
    </aside>
  );
}
