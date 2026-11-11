import type { Category, Prisma, Product } from "@prisma/client";
import { prisma } from "./db";
import type { GameProfile } from "./fps";
import { Part, Slot, SLOTS } from "./specs";

const isSlot = (value: string): value is Slot => (SLOTS as readonly string[]).includes(value);

const toPart = (row: Product & { category: Category }): Part => ({
  id: row.id,
  slug: row.slug,
  slot: row.category.slug as Slot,
  brand: row.brand,
  name: row.name,
  descRu: row.descRu,
  descUz: row.descUz,
  priceUzs: row.priceUzs,
  stock: row.stock,
  specs: row.specs as unknown as Part["specs"],
});

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
}

export async function getCategory(slug: string) {
  return isSlot(slug) ? prisma.category.findUnique({ where: { slug } }) : null;
}

export async function getParts(slot?: Slot): Promise<Part[]> {
  const where: Prisma.ProductWhereInput = { active: true, ...(slot ? { category: { slug: slot } } : {}) };
  const rows = await prisma.product.findMany({ where, include: { category: true }, orderBy: { priceUzs: "asc" } });
  return rows.map(toPart);
}

export async function getPart(slug: string): Promise<Part | null> {
  const row = await prisma.product.findFirst({ where: { slug, active: true }, include: { category: true } });
  return row ? toPart(row) : null;
}

export async function getGames(): Promise<GameProfile[]> {
  const rows = await prisma.game.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return rows.map(({ active: _active, ...game }) => game);
}
