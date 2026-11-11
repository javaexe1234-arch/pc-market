import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { JetBrains_Mono, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { savedTheme } from "@/lib/theme";
import ru from "../../../messages/ru.json";
import "../globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Управление",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const theme = await savedTheme();
  return (
    <html lang="ru" data-theme={theme} className={`${manrope.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <NextIntlClientProvider locale="ru" messages={{ nav: ru.nav }}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
