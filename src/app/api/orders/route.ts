import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { parseLines, validateFields } from "@/lib/order-validation";
import { OrderUnavailableError, placeOrder } from "@/lib/orders";
import { allowRequest, clientIp } from "@/lib/rate-limit";

const ORDERS_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  if (!allowRequest(`order:${clientIp(request)}`, ORDERS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "badRequest" }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const lines = parseLines(body?.lines);
  if (!body || !lines) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const { fields, errors } = validateFields(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "invalidFields", fields: errors }, { status: 422 });
  }

  const locale = (routing.locales as readonly unknown[]).includes(body.locale) ? (body.locale as string) : routing.defaultLocale;
  try {
    const order = await placeOrder(fields, lines, locale);
    return NextResponse.json({ token: order.token }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderUnavailableError) {
      return NextResponse.json({ error: "unavailable", productIds: error.productIds }, { status: 409 });
    }
    throw error;
  }
}
