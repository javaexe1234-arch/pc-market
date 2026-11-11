"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function PayByCard({ token }: { token: string }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pay() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/orders/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-signal/50 bg-panel p-5" data-testid="pay-by-card">
      <h2 className="text-lg font-bold">{t("cardTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("cardText")}</p>
      <button type="button" disabled={busy} onClick={pay} className="btn btn-primary mt-3 disabled:opacity-50" data-testid="pay-by-card-button">
        {busy ? t("cardRedirecting") : t("cardPay")}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{t("cardError")}</p>}
    </section>
  );
}
