import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { CheckoutFields, OrderLine } from "./order-validation";

export const ORDER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export class OrderUnavailableError extends Error {
  constructor(public readonly productIds: number[]) {
    super("Some products are unavailable");
  }
}

/**
 * Creates an order and reserves stock in one transaction. Prices come from the database,
 * never from the browser, and a line that cannot be fully reserved rolls everything back.
 */
export async function placeOrder(fields: CheckoutFields, lines: OrderLine[], locale: string) {
  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, active: true } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const unavailable: number[] = [];
    for (const line of lines) {
      const reserved = await tx.product.updateMany({
        where: { id: line.productId, active: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) unavailable.push(line.productId);
    }
    if (unavailable.length > 0) throw new OrderUnavailableError(unavailable);

    const items = lines.map((line) => {
      const product = byId.get(line.productId)!;
      return {
        productId: product.id,
        brand: product.brand,
        name: product.name,
        priceUzs: product.priceUzs,
        quantity: line.quantity,
      };
    });
    const total = items.reduce((sum, item) => sum + BigInt(item.priceUzs) * BigInt(item.quantity), BigInt(0));

    return tx.order.create({
      data: {
        token: randomBytes(24).toString("base64url"),
        customerName: fields.customerName,
        phone: fields.phone,
        address: fields.address,
        comment: fields.comment || null,
        locale,
        totalUzs: total,
        items: { create: items },
      },
    });
  });
}

export type OrderDecision = "confirmed" | "rejected";

const ALLOWED_FROM: Record<OrderDecision, string[]> = {
  confirmed: ["awaiting_payment", "receipt_received"],
  // A confirmed order can still be rejected, for example after a refund.
  rejected: ["awaiting_payment", "receipt_received", "confirmed"],
};

/**
 * Applies the owner's decision. Rejecting returns the reserved items to stock, exactly once:
 * the status is updated on condition that it hasn't changed, and a rejected order stays final.
 */
export async function decideOrder(id: number, decision: OrderDecision): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || !ALLOWED_FROM[decision].includes(order.status)) return false;
    const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: decision } });
    if (updated.count === 0) return false;
    if (decision === "rejected") {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
    return true;
  });
}

export function getOrderByToken(token: string) {
  if (!ORDER_TOKEN_PATTERN.test(token)) return Promise.resolve(null);
  return prisma.order.findUnique({ where: { token }, include: { items: true } });
}

export const formatOrderNumber = (id: number) => String(id).padStart(6, "0");
