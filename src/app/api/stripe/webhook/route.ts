import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-payments";

const PAYING_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * Stripe calls this after a payment. Only requests signed with STRIPE_WEBHOOK_SECRET are trusted,
 * so the endpoint can be public. Set its URL in the Stripe Dashboard to <site>/api/stripe/webhook.
 */
export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return NextResponse.json({ error: "notConfigured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "noSignature" }, { status: 400 });

  // The signature covers the exact bytes Stripe sent, so read the raw body, not parsed JSON.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "badSignature" }, { status: 400 });
  }

  if (PAYING_EVENTS.has(event.type)) {
    const result = await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
    return NextResponse.json({ received: true, result });
  }
  return NextResponse.json({ received: true });
}
