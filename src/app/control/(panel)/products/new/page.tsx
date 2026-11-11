import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { Slot, SLOTS } from "@/lib/specs";
import { saveProduct } from "../../../actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string }> };

export default async function NewProductPage({ searchParams }: Props) {
  const config = await requireAdmin();
  const { category } = await searchParams;
  const slot: Slot = (SLOTS as readonly string[]).includes(category ?? "") ? (category as Slot) : "cpu";
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-4">
      <Link href={adminHref(config, "/products")} className="text-sm text-muted hover:text-text">← Товары</Link>
      <h1 className="text-2xl font-extrabold">Новый товар</h1>
      <nav aria-label="Категория" className="flex flex-wrap gap-2 text-sm font-semibold">
        {categories.map((c) => (
          <Link key={c.slug} href={adminHref(config, `/products/new?category=${c.slug}`)} className={`rounded-lg border border-line px-3 py-1.5 ${slot === c.slug ? "bg-raised text-signal" : "text-muted"}`}>{c.nameRu}</Link>
        ))}
      </nav>
      <ProductForm key={slot} action={saveProduct} slot={slot} initial={{ active: "on", stock: "0" }} />
    </div>
  );
}
