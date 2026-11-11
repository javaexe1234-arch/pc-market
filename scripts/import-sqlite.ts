/**
 * One-time copy of the old local SQLite database into Neon Postgres, keeping every id.
 * Run once after `npm run db:migrate`: npm run db:import-sqlite -- prisma/dev.db
 * It refuses to run if the Neon database already has products, so it can't duplicate data.
 */
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

const source = process.argv[2] ?? "prisma/dev.db";
const sqlite = new DatabaseSync(source, { readOnly: true });
const prisma = new PrismaClient();

type Row = Record<string, unknown>;
const rows = (table: string) => sqlite.prepare(`SELECT * FROM "${table}" ORDER BY id`).all() as Row[];
const bool = (value: unknown) => value === 1 || value === true;
/** Prisma stored SQLite dates as milliseconds or as text. */
const date = (value: unknown) => (value === null || value === undefined ? null : new Date(value as number | string));

async function main() {
  if ((await prisma.product.count()) > 0) {
    console.log("The Neon database already has products. Nothing imported.");
    return;
  }

  const categories = rows("Category").map((c) => ({
    id: Number(c.id), slug: String(c.slug), nameRu: String(c.nameRu), nameUz: String(c.nameUz), order: Number(c.order),
  }));
  const products = rows("Product").map((p) => ({
    id: Number(p.id), slug: String(p.slug), brand: String(p.brand), name: String(p.name),
    descRu: String(p.descRu), descUz: String(p.descUz), priceUzs: Number(p.priceUzs), stock: Number(p.stock),
    specs: JSON.parse(String(p.specs)), active: bool(p.active), categoryId: Number(p.categoryId),
    createdAt: date(p.createdAt)!, updatedAt: date(p.updatedAt)!,
  }));
  const games = rows("Game").map((g) => ({
    id: Number(g.id), slug: String(g.slug), name: String(g.name), year: Number(g.year),
    fpsLow: Number(g.fpsLow), fpsMedium: Number(g.fpsMedium), fpsHigh: Number(g.fpsHigh), fpsUltra: Number(g.fpsUltra),
    cpuFps: Number(g.cpuFps), ramGb: Number(g.ramGb), vramLow: Number(g.vramLow), vramMedium: Number(g.vramMedium),
    vramHigh: Number(g.vramHigh), vramUltra: Number(g.vramUltra), active: bool(g.active),
  }));
  const orders = rows("Order").map((o) => ({
    id: Number(o.id), token: String(o.token), status: String(o.status), customerName: String(o.customerName),
    phone: String(o.phone), address: String(o.address), comment: o.comment === null ? null : String(o.comment),
    locale: String(o.locale), totalUzs: BigInt(o.totalUzs as number), receiptFile: o.receiptFile === null ? null : String(o.receiptFile),
    receiptMime: o.receiptMime === null ? null : String(o.receiptMime), receiptUploadedAt: date(o.receiptUploadedAt),
    receiptAttempts: Number(o.receiptAttempts), telegramSentAt: date(o.telegramSentAt),
    telegramError: o.telegramError === null ? null : String(o.telegramError),
    createdAt: date(o.createdAt)!, updatedAt: date(o.updatedAt)!,
  }));
  const items = rows("OrderItem").map((i) => ({
    id: Number(i.id), orderId: Number(i.orderId), productId: Number(i.productId), brand: String(i.brand),
    name: String(i.name), priceUzs: Number(i.priceUzs), quantity: Number(i.quantity),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.category.createMany({ data: categories });
    await tx.product.createMany({ data: products });
    await tx.game.createMany({ data: games });
    await tx.order.createMany({ data: orders });
    await tx.orderItem.createMany({ data: items });
    // Ids were copied as they were, so move each id counter past the highest copied id.
    for (const table of ["Category", "Product", "Game", "Order", "OrderItem"]) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`,
      );
    }
  });

  console.log(
    `Imported ${categories.length} categories, ${products.length} products, ${games.length} games, ` +
      `${orders.length} orders, ${items.length} order items.`,
  );
  if (orders.some((o) => o.receiptFile)) {
    console.log("Some orders have receipts in storage/receipts: upload them to the bucket separately.");
  }
}

main().finally(() => prisma.$disconnect());
