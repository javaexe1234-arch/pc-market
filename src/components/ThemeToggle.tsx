"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/** Must match THEME_COOKIE in src/lib/theme.ts, which the server reads. */
const COOKIE = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;
/** Where the choice was kept before it moved to a cookie. */
const OLD_STORAGE_KEY = "pc-market-theme";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function ThemeToggle() {
  const t = useTranslations("nav");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    let current = root.dataset.theme as Theme | undefined;
    if (!current) {
      let old: string | null = null;
      try {
        old = localStorage.getItem(OLD_STORAGE_KEY);
        localStorage.removeItem(OLD_STORAGE_KEY);
      } catch {
        // Storage can be blocked; the system setting still applies.
      }
      if (old === "light" || old === "dark") {
        apply(old);
        current = old;
      } else {
        current = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
    }
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    apply(next);
    setTheme(next);
  }

  const label = theme === "light" ? t("themeToDark") : t("themeToLight");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line text-muted hover:text-text"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "light" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
