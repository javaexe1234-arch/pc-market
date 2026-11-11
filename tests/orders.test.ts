import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const FIELDS = { customerName: "Test", phone: "+998901234567", address: "Tashkent", comment: "" };

/**
 * These tests run against the separate Neon branch "test" (TEST_DATABASE_URL in .env). They never
 * wipe it: each run creates its own category and products, and deletes them and their orders at
 * the end. Skipped when the variable isn't set, and refused against the app's own database.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const TEST_URL_DIRECT = process.env.TEST_DATABASE_URL_UNPOOLED;
const host = (url?: string) => (url ? new URL(url).hostname.replace("-pooler", "") : "");
const usable = !!TEST_URL && !!TEST_URL_DIRECT && host(TEST_URL) !== host(process.env.DATABASE_URL);

const RUN = randomBytes(4).toString("hex");
let prisma: PrismaClient;
let orders: typeof import("../src/lib/orders");
let categoryId: number;
let productId: number;
let otherId: number;

beforeAll(async () => {
  if (!usable) return;
  process.env.DATABASE_URL = TEST_URL;
  process.env.DATABASE_URL_UNPOOLED = TEST_URL_DIRECT;
  // Applies any new migrations to the test branch; it never deletes data.
  execSync("npx prisma migrate deploy", { env: process.env, stdio: "ignore" });
  prisma = (await import("../src/lib/db")).prisma;
  orders = await import("../src/lib/orders");
  categoryId = (await prisma.category.create({ data: { slug: `test-${RUN}`, nameRu: "c", nameUz: "c" } })).id;
  const make = (name: string) =>
    prisma.product.create({
      data: { slug: `test-${RUN}-${name}`, brand: "B", name, descRu: "", descUz: "", priceUzs: 42_000_000, stock: 0, specs: {}, categoryId },
    });
  productId = (await make("a")).id;
  otherId = (await make("b")).id;
}, 120_000);

afterAll(async () => {
  if (!usable || !prisma) return;
  const ids = [productId, otherId];
  await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  if (!usable) return;
  await prisma.product.updateMany({ where: { id: { in: [productId, otherId] } }, data: { stock: 5, priceUzs: 42_000_000, active: true } });
});

const stock = async (id: number) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

describe.skipIf(!usable)("placeOrder", () => {
  it("reserves stock and copies database prices into the order", async () => {
    const order = await orders.placeOrder(FIELDS, [{ productId, quantity: 2 }], "ru");
    expect(await stock(productId)).toBe(3);
    const saved = await orders.getOrderByToken(order.token);
    expect(saved?.items[0]).toMatchObject({ priceUzs: 42_000_000, quantity: 2, name: "a" });
    expect(saved?.status).toBe("awaiting_payment");
    expect(saved?.token).toMatch(orders.ORDER_TOKEN_PATTERN);
  });

  it("keeps totals above the 32-bit limit exact", async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 100 } });
    const order = await orders.placeOrder(FIELDS, [{ productId, quantity: 60 }], "ru");
    expect(order.totalUzs).toBe(BigInt(2_520_000_000));
  });

  it("rolls everything back when one line can't be reserved", async () => {
    const before = await prisma.order.count();
    await expect(
      orders.placeOrder(FIELDS, [{ productId, quantity: 1 }, { productId: otherId, quantity: 6 }], "ru"),
    ).rejects.toMatchObject({ productIds: [otherId] });
    expect(await stock(productId)).toBe(5);
    expect(await prisma.order.count()).toBe(before);
  });

  it("refuses inactive and unknown products", async () => {
    await prisma.product.update({ where: { id: productId }, data: { active: false } });
    await expect(orders.placeOrder(FIELDS, [{ productId, quantity: 1 }], "ru")).rejects.toBeInstanceOf(orders.OrderUnavailableError);
    await expect(orders.placeOrder(FIELDS, [{ productId: 999999, quantity: 1 }], "ru")).rejects.toBeInstanceOf(orders.OrderUnavailableError);
  });

  it("never sells the last unit twice", async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 1 } });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => orders.placeOrder(FIELDS, [{ productId, quantity: 1 }], "ru")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stock(productId)).toBe(0);
  });
});

describe.skipIf(!usable)("decideOrder", () => {
  const place = () => orders.placeOrder(FIELDS, [{ productId, quantity: 2 }], "ru");
  const statusOf = async (id: number) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

  it("confirms without touching stock", async () => {
    const order = await place();
    expect(await orders.decideOrder(order.id, "confirmed")).toBe(true);
    expect(await statusOf(order.id)).toBe("confirmed");
    expect(await stock(productId)).toBe(3);
  });

  it("returns stock on rejection, and only once", async () => {
    const order = await place();
    expect(await stock(productId)).toBe(3);
    expect(await orders.decideOrder(order.id, "rejected")).toBe(true);
    expect(await stock(productId)).toBe(5);
    expect(await orders.decideOrder(order.id, "rejected")).toBe(false);
    expect(await stock(productId)).toBe(5);
  });

  it("returns stock once when two rejections race", async () => {
    const order = await place();
    const results = await Promise.all([orders.decideOrder(order.id, "rejected"), orders.decideOrder(order.id, "rejected")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await stock(productId)).toBe(5);
  });

  it("can reject a confirmed order, but not confirm a rejected one", async () => {
    const order = await place();
    await orders.decideOrder(order.id, "confirmed");
    expect(await orders.decideOrder(order.id, "rejected")).toBe(true);
    expect(await stock(productId)).toBe(5);
    expect(await orders.decideOrder(order.id, "confirmed")).toBe(false);
    expect(await statusOf(order.id)).toBe("rejected");
  });

  it("does nothing for an unknown order", async () => {
    expect(await orders.decideOrder(999999, "confirmed")).toBe(false);
  });
});

describe.skipIf(!usable)("getOrderByToken", () => {
  it("rejects malformed tokens without querying", async () => {
    expect(await orders.getOrderByToken("../../etc/passwd")).toBeNull();
    expect(await orders.getOrderByToken("A".repeat(32))).toBeNull();
  });
});
