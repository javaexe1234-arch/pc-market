"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt";

interface Props {
  token: string;
  hasReceipt: boolean;
  delivered: boolean;
  attemptsLeft: number;
}

const KNOWN_ERRORS = new Set(["tooLarge", "badType", "noFile", "tooManyAttempts", "tooManyRequests", "orderClosed"]);

export function ReceiptUpload({ token, hasReceipt, delivered, attemptsLeft }: Props) {
  const t = useTranslations("order");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, body?: FormData) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(KNOWN_ERRORS.has(data.error) ? data.error : "generic");
      }
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      setError("tooLarge");
      event.target.value = "";
      return;
    }
    const form = new FormData();
    form.set("receipt", file);
    void send(`/api/orders/${token}/receipt`, form);
  }

  return (
    <section className="rounded-xl border border-line bg-panel p-5" data-testid="receipt-section">
      <h2 className="text-lg font-bold">{hasReceipt ? t("receiptSentTitle") : t("receiptTitle")}</h2>

      {hasReceipt && delivered && <p className="mt-1 text-sm text-good" data-testid="receipt-delivered">{t("receiptDelivered")}</p>}
      {hasReceipt && !delivered && (
        <div className="mt-1 space-y-2" data-testid="receipt-pending">
          <p className="text-sm text-warn">{t("receiptPending")}</p>
          <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => send(`/api/orders/${token}/receipt/resend`)}>
            {t("retry")}
          </button>
        </div>
      )}
      {!hasReceipt && <p className="mt-1 text-sm text-muted">{t("receiptText")}</p>}

      {attemptsLeft > 0 ? (
        <label className={`btn mt-3 ${hasReceipt ? "btn-ghost" : "btn-primary"} ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? t("uploading") : hasReceipt ? t("replaceReceipt") : t("chooseFile")}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={onFile}
            data-testid="receipt-input"
          />
        </label>
      ) : (
        <p className="mt-3 text-sm text-muted">{t("error_tooManyAttempts")}</p>
      )}
      <p className="mt-2 text-xs text-muted">{t("fileHint")}</p>

      {error && <p role="alert" className="mt-2 text-sm text-danger" data-testid="receipt-error">{t(`error_${error}` as never)}</p>}
    </section>
  );
}
