import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const config = await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <span className="font-mono font-bold">PC<span className="text-signal">_</span>ADMIN</span>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            <Link href={adminHref(config)} className="hover:text-signal">Заказы</Link>
            <Link href={adminHref(config, "/products")} className="hover:text-signal">Товары</Link>
            <Link href={adminHref(config, "/games")} className="hover:text-signal">Игры</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <a href="/ru" target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-text">Сайт</a>
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="btn btn-ghost !min-h-8 !py-1">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </>
  );
}
