import { PrismaClient } from "@prisma/client";
import { SLOTS } from "../../src/lib/specs";
import { GAMES } from "./games";
import { CATEGORIES, describePart, PRODUCTS, Row } from "./products";

const prisma = new PrismaClient();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  for (const [order, c] of CATEGORIES.entries()) {
    const data = { nameRu: c.nameRu, nameUz: c.nameUz, order };
    await prisma.category.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
  }

  let products = 0;
  for (const slot of SLOTS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: slot } });
    for (const row of PRODUCTS[slot] as Row[]) {
      const { ru, uz } = describePart(slot, row);
      const data = {
        brand: row.brand,
        name: row.name,
        descRu: ru,
        descUz: uz,
        priceUzs: row.price * 1000,
        stock: 10,
        specs: row.specs as object,
        categoryId: category.id,
      };
      const slug = slugify(`${row.brand}-${row.name}`);
      await prisma.product.upsert({ where: { slug }, update: data, create: { slug, ...data } });
      products++;
    }
  }

  for (const game of GAMES) {
    await prisma.game.upsert({ where: { slug: game.slug }, update: game, create: game });
  }
  console.log(`Seeded ${CATEGORIES.length} categories, ${products} products, ${GAMES.length} games.`);
}

main().finally(() => prisma.$disconnect());
