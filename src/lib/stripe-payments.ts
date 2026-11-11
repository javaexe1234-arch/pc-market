import type Stripe from "stripe";
import { prisma } from "./db";
import { formatUzs } from "./format";
import { formatOrderNumber } from "./orders";
import { sessionPaysOrder, STRIPE_CURRENCY, stripeClient, toStripeAmount } from "./stripe";
import { callTelegram, telegramConfig, TelegramError } from "./telegram";

/** A Checkout link stays usable this long; Stripe's minimum is 30 minutes. */
const CHECKOUT_LIFETIME_S = 30 * 60;

const OPEN_STATUSES = ["awaiting_payment", "receipt_received"];

export class CheckoutUnavailableError extends Error {}

/** Starts a Stripe Checkout payment for the order. Amounts always come from the database. */
export async function createCheckout(token: string, origin: string, locale: string): Promise<string> {
  const stripe = stripeClient();
  if (!stripe) throw new CheckoutUnavailableError("Stripe is not configured");

  const order = await prisma.order.findUnique({ where: { token }, include: { items: true } });
  if (!order || !OPEN_STATUSES.includes(order.status)) throw new CheckoutUnavailableError("Order can't be paid");

  const orderUrl = `${origin}/${locale}/order/${order.token}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: toStripeAmount(item.priceUzs),
        product_data: { name: `${item.brand} ${item.name}` },
      },
    })),
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id) },
    payment_intent_data: { metadata: { orderId: String(order.id) } },
    locale: locale === "ru" ? "ru" : "auto",
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_S,
    success_url: `${orderUrl}?stripe_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${orderUrl}?stripe=cancelled`,
  });
  if (session.amount_total !== toStripeAmount(Number(order.totalUzs))) {
    throw new Error(`Order ${order.id}: Checkout total doesn't match the order total`);
  }
  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  if (!session.url) throw new Error("Stripe returned no Checkout URL");
  return session.url;
}

async function notifyOwner(text: string) {
  const config = telegramConfig();
  if (!config) return;
  try {
    await callTelegram(config, "sendMessage", { chat_id: config.chatId, text });
  } catch (error) {
    if (!(error instanceof TelegramError)) throw error;
    console.error(`Could not notify Telegram about a Stripe payment: ${error.message}`);
  }
}

export type FulfillResult = "paid" | "alreadyPaid" | "notPaid" | "paidButClosed";

/**
 * Marks the order paid when a Checkout Session completed it. Safe to call any number of times, from
 * the webhook and from the return page: only the first call changes the order and notifies the owner.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillResult> {
  const orderId = Number(session.metadata?.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) return "notPaid";
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !sessionPaysOrder(session, order)) return "notPaid";
  if (order.paymentMethod === "stripe") return "alreadyPaid";

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: { in: OPEN_STATUSES }, paymentMethod: null },
    data: {
      status: "confirmed",
      paymentMethod: "stripe",
      stripeSessionId: session.id,
      stripePaymentIntent: paymentIntent,
      paidAt: new Date(),
    },
  });

  const number = formatOrderNumber(order.id);
  if (updated.count === 1) {
    await notifyOwner(
      `💳 Заказ №${number} оплачен картой через Stripe: ${formatUzs(Number(order.totalUzs), "ru")}.\n` +
        `Покупатель: ${order.customerName}, ${order.phone}.\nПлатёж: ${paymentIntent ?? session.id}`,
    );
    return "paid";
  }

  // The order was closed (for example, rejected) before the money arrived: the owner must refund it.
  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (current?.paymentMethod === "stripe") return "alreadyPaid";
  await notifyOwner(
    `⚠️ Пришла оплата Stripe по заказу №${number}, но заказ уже закрыт (${current?.status}). ` +
      `Верните деньги в панели Stripe. Платёж: ${paymentIntent ?? session.id}`,
  );
  return "paidButClosed";
}
