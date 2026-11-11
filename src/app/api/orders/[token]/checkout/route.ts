import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { ORDER_TOKEN_PATTERN } from "@/lib/orders";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { CheckoutUnavailableError, createCheckout } from "@/lib/stripe-payments";

const CHECKOUTS_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;

type Context = { params: Promise<{ token: string }> };

/** Starts card payment for an order and returns the Stripe Checkout address to send the buyer to. */
export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  if (!ORDER_TOKEN_PATTERN.test(token)) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!allowRequest(`checkout:${clientIp(request)}`, CHECKOUTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { locale?: unknown };
  const locale = (routing.locales as readonly unknown[]).includes(body.locale) ? (body.locale as string) : routing.defaultLocale;

  try {
    const url = await createCheckout(token, new URL(request.url).origin, locale);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof CheckoutUnavailableError) return NextResponse.json({ error: "unavailable" }, { status: 409 });
    console.error("Stripe Checkout failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "stripeError" }, { status: 502 });
  }
}
