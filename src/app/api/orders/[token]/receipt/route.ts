import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrderByToken } from "@/lib/orders";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { detectReceiptType, MAX_RECEIPT_ATTEMPTS, MAX_RECEIPT_BYTES } from "@/lib/receipt";
import { deliverReceipt } from "@/lib/receipt-delivery";
import { deleteReceipt, receiptKey, saveReceipt } from "@/lib/receipt-storage";

const UPLOADS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;
/** Multipart framing adds a little to the file's own size. */
const MAX_REQUEST_BYTES = MAX_RECEIPT_BYTES + 64 * 1024;

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  if (!allowRequest(`receipt:${clientIp(request)}`, UPLOADS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "tooManyRequests" }, { status: 429 });
  }

  const order = await getOrderByToken(token);
  if (!order) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (order.status === "confirmed" || order.status === "rejected") {
    return NextResponse.json({ error: "orderClosed" }, { status: 409 });
  }
  if (order.receiptAttempts >= MAX_RECEIPT_ATTEMPTS) {
    return NextResponse.json({ error: "tooManyAttempts" }, { status: 429 });
  }

  // Checked before reading the body, so an oversized upload never reaches memory.
  const length = Number(request.headers.get("content-length"));
  if (!length) return NextResponse.json({ error: "badRequest" }, { status: 411 });
  if (length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("receipt");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "noFile" }, { status: 400 });
  if (file.size > MAX_RECEIPT_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectReceiptType(bytes);
  if (!type) return NextResponse.json({ error: "badType" }, { status: 415 });

  const key = receiptKey(order.id, type);
  try {
    await saveReceipt(key, bytes, type);
  } catch (error) {
    console.error(`Order ${order.id}: could not store the receipt:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "storageUnavailable" }, { status: 503 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "receipt_received",
      receiptFile: key,
      receiptMime: type.mime,
      receiptUploadedAt: new Date(),
      receiptAttempts: { increment: 1 },
      telegramSentAt: null,
      telegramError: null,
    },
  });
  if (order.receiptFile) await deleteReceipt(order.receiptFile);

  const delivered = await deliverReceipt(order.id);
  return NextResponse.json({ delivered });
}
