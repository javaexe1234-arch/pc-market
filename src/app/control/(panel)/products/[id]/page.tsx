import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { specsToValues } from "@/lib/spec-schema";
import type { Slot } from "@/lib/specs";
import { saveProduct } from "../../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  const config = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) notFound();
  const slot = product.category.slug as Slot;
  const saved = (await searchParams).saved;

  return (
    <div className="space-y-4">
      <Link href={adminHref(config, "/products")} className="text-sm text-muted hover:text-text">← Товары</Link>
      <div>
        <h1 className="text-2xl font-extrabold">{product.brand} {product.name}</h1>
        <p className="text-sm text-muted">
          {product.category.nameRu} ·{" "}
          {product.active ? <a href={`/ru/product/${product.slug}`} target="_blank" rel="noreferrer" className="underline">открыть на сайте</a> : "скрыт на сайте"}
        </p>
        {saved && <p role="status" className="mt-1 text-sm text-good" data-testid="admin-notice">Сохранено.</p>}
      </div>
      <ProductForm
        action={saveProduct}
        slot={slot}
        id={product.id}
        initial={{
          brand: product.brand,
          name: product.name,
          descRu: product.descRu,
          descUz: product.descUz,
          priceUzs: String(product.priceUzs),
          stock: String(product.stock),
          active: product.active ? "on" : undefined,
          ...specsToValues(slot, product.specs as Record<string, unknown>),
        }}
      />
    </div>
  );
}
