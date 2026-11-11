import { NextResponse } from "next/server";
import { getOrderByToken } from "@/lib/orders";
import { allowRequest } from "@/lib/rate-limit";
import { deliverReceipt } from "@/lib/receipt-delivery";

const RESENDS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

type Context = { params: Promise<{ token: string }> };

/** Retries delivery of a saved receipt. Does nothing if it has already reached Telegram. */
export async function POST(_request: Request, { params }: Context) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order || !order.receiptFile) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (order.telegramSentAt) return NextResponse.json({ delivered: true });
  if (!allowRequest(`resend:${order.id}`, RESENDS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }
  return NextResponse.json({ delivered: await deliverReceipt(order.id) });
}
