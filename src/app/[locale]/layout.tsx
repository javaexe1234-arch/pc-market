import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { routing } from "@/i18n/routing";
import { savedTheme } from "@/lib/theme";
import "../globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono-face" });

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "footer" });
  const theme = await savedTheme();

  return (
    // The toggle changes data-theme after load, so React must not treat that as a mismatch.
    <html lang={locale} data-theme={theme} className={`${manrope.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted sm:px-6">{t("demo")}</div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
