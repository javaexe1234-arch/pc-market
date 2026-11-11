import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PayByCard } from "@/components/checkout/PayByCard";
import { ReceiptUpload } from "@/components/checkout/ReceiptUpload";
import { formatUzs } from "@/lib/format";
import { formatOrderNumber, getOrderByToken } from "@/lib/orders";
import { MAX_RECEIPT_ATTEMPTS } from "@/lib/receipt";
import { stripeClient } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-payments";

export const dynamic = "force-dynamic";

// The link holds the customer's contact details, so search engines must not index it.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ stripe_session?: string; stripe?: string }>;
};

/** Back from Stripe: confirm the payment right away instead of waiting for the webhook. */
async function confirmReturn(sessionId: string | undefined) {
  const stripe = stripeClient();
  if (!stripe || !sessionId || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return;
  try {
    await fulfillCheckoutSession(await stripe.checkout.sessions.retrieve(sessionId));
  } catch (error) {
    console.error("Could not confirm the Stripe payment on return:", error instanceof Error ? error.message : error);
  }
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  const query = await searchParams;
  if (query.stripe_session && (await getOrderByToken(token))) await confirmReturn(query.stripe_session);
  const order = await getOrderByToken(token);
  if (!order) notFound();
  const t = await getTranslations("order");

  const number = formatOrderNumber(order.id);
  const hasReceipt = !!order.receiptFile;
  const closed = order.status === "confirmed" || order.status === "rejected";
  const card = process.env.PAYMENT_CARD_NUMBER?.trim();
  const holder = process.env.PAYMENT_CARD_HOLDER?.trim();
  const cardPayment = !closed && !!stripeClient();
  const paidByCard = order.paymentMethod === "stripe";
  const awaitingStripe = !!query.stripe_session && !paidByCard && !closed;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">{t("title", { number })}</h1>
        <p className="mt-2 font-semibold" data-testid="order-status">{t(`status_${order.status}` as never)}</p>
        <p className="mt-1 text-sm text-muted">{t("keepLink")}</p>
        {paidByCard && <p role="status" className="mt-2 text-sm text-good" data-testid="paid-by-card">{t("cardPaid")}</p>}
        {awaitingStripe && <p role="status" className="mt-2 text-sm text-warn" data-testid="card-pending">{t("cardPending")}</p>}
        {query.stripe === "cancelled" && !closed && <p role="status" className="mt-2 text-sm text-muted">{t("cardCancelled")}</p>}
      </div>

      {cardPayment && <PayByCard token={order.token} />}

      {!closed && (
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="text-lg font-bold">{cardPayment ? t("transferTitle") : t("payTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("payText")}</p>
          <p className="mt-3 font-mono text-2xl font-semibold" data-testid="order-total">{formatUzs(Number(order.totalUzs), locale)}</p>
          {card ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">{t("cardNumber")}:</dt>
                <dd className="font-mono font-semibold select-all" data-testid="card-number">{card}</dd>
              </div>
              {holder && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">{t("cardHolder")}:</dt>
                  <dd className="font-semibold">{holder}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-warn" data-testid="no-card">{t("noCard", { phone: order.phone })}</p>
          )}
        </section>
      )}

      {!closed && (
        <ReceiptUpload
          token={order.token}
          hasReceipt={hasReceipt}
          delivered={!!order.telegramSentAt}
          attemptsLeft={MAX_RECEIPT_ATTEMPTS - order.receiptAttempts}
        />
      )}

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="text-lg font-bold">{t("items")}</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <span>{item.brand} {item.name} × {item.quantity}</span>
              <span className="font-mono">{formatUzs(item.priceUzs * item.quantity, locale)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between gap-4 font-semibold">
            <dt>{t("total")}</dt>
            <dd className="font-mono">{formatUzs(Number(order.totalUzs), locale)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("customer")}</dt>
            <dd className="text-right">{order.customerName}, {order.phone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("address")}</dt>
            <dd className="text-right">{order.address}</dd>
          </div>
          {order.comment && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("comment")}</dt>
              <dd className="text-right">{order.comment}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
