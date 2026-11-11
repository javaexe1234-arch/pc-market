"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { hydrateBuildStore, selectionCount, useBuildStore } from "@/lib/build-store";
import { cartCount, hydrateCartStore, useCartStore } from "@/lib/cart-store";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const count = useBuildStore((s) => selectionCount(s.selection));
  const inCart = useCartStore((s) => cartCount(s.lines));

  useEffect(() => {
    hydrateBuildStore();
    hydrateCartStore();
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          PC<span className="text-signal">_</span>MARKET
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/catalog" className="hover:text-signal">{t("catalog")}</Link>
          <Link href="/builder" className="flex items-center gap-2 hover:text-signal">
            {t("builder")}
            {count > 0 && (
              <span aria-label={`${t("myBuild")}: ${count}`} className="rounded bg-signal px-1.5 font-mono text-xs text-signal-ink">
                {count}
              </span>
            )}
          </Link>
          <Link href="/cart" className="flex items-center gap-2 hover:text-signal" data-testid="nav-cart">
            {t("cart")}
            {inCart > 0 && (
              <span className="rounded bg-signal px-1.5 font-mono text-xs text-signal-ink" data-testid="cart-count">{inCart}</span>
            )}
          </Link>
        </nav>
        <div className="ml-auto"><ThemeToggle /></div>
        <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-lg border border-line text-sm font-semibold">
          {(["ru", "uz"] as const).map((code) => (
            <Link
              key={code}
              href={pathname}
              locale={code}
              aria-current={code === locale ? "true" : undefined}
              className={`px-3 py-1.5 ${code === locale ? "bg-raised text-signal" : "text-muted hover:text-text"}`}
            >
              {code === "ru" ? "RU" : "UZ"}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
