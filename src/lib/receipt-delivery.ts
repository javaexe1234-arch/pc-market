import { prisma } from "./db";
import { formatOrderNumber } from "./orders";
import { detectReceiptType } from "./receipt";
import { readReceipt } from "./receipt-storage";
import { sendReceiptToTelegram, telegramConfig, TelegramError } from "./telegram";

/** Sends an order's saved receipt to Telegram and records the outcome. Returns whether it arrived. */
export async function deliverReceipt(orderId: number): Promise<boolean> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!order.receiptFile) return false;

  const config = telegramConfig();
  if (!config) {
    await prisma.order.update({ where: { id: orderId }, data: { telegramError: "Telegram is not configured" } });
    console.warn(`Order ${order.id}: receipt saved, but Telegram is not configured.`);
    return false;
  }

  const bytes = await readReceipt(order.receiptFile);
  const type = bytes && detectReceiptType(bytes);
  if (!bytes || !type) {
    await prisma.order.update({ where: { id: orderId }, data: { telegramError: "Receipt file could not be read from storage" } });
    return false;
  }

  const number = formatOrderNumber(order.id);
  try {
    await sendReceiptToTelegram(
      config,
      {
        number,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        comment: order.comment,
        totalUzs: Number(order.totalUzs),
        items: order.items,
      },
      { bytes, mime: type.mime, isImage: type.isImage, fileName: `receipt-${number}.${type.extension}` },
    );
  } catch (error) {
    if (!(error instanceof TelegramError)) throw error;
    await prisma.order.update({ where: { id: orderId }, data: { telegramError: error.message } });
    console.error(`Order ${order.id}: could not send the receipt to Telegram: ${error.message}`);
    return false;
  }

  await prisma.order.update({ where: { id: orderId }, data: { telegramSentAt: new Date(), telegramError: null } });
  return true;
}
