import Stripe from "stripe";

/** Prices are in whole sum; Stripe counts UZS in tiyin, a hundredth of a sum. */
export const STRIPE_CURRENCY = "uzs";
export const toStripeAmount = (sum: number) => sum * 100;

let client: Stripe | null | undefined;

/** Null until STRIPE_SECRET_KEY is set: card payment then stays hidden and only bank transfer is offered. */
export function stripeClient(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    client = key ? new Stripe(key) : null;
  }
  return client;
}

export interface PayableOrder {
  id: number;
  totalUzs: bigint;
}

/**
 * Whether a Checkout Session really paid this order in full. The webhook and the return page both
 * check this, so a session for another order, another amount or another currency is never accepted.
 */
export function sessionPaysOrder(session: Pick<Stripe.Checkout.Session, "payment_status" | "metadata" | "currency" | "amount_total">, order: PayableOrder): boolean {
  return (
    session.payment_status === "paid" &&
    session.metadata?.orderId === String(order.id) &&
    session.currency === STRIPE_CURRENCY &&
    session.amount_total === toStripeAmount(Number(order.totalUzs))
  );
}
