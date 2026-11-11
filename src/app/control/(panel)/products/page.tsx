import Link from "next/link";
import { adminHref } from "@/lib/admin-config";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { Slot, SLOTS } from "@/lib/specs";
import { quickUpdateProduct } from "../../actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string; q?: string; saved?: string; error?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const config = await requireAdmin();
  const { category, q = "", saved, error } = await searchParams;
  const slot = (SLOTS as readonly string[]).includes(category ?? "") ? (category as Slot) : undefined;

  const [categories, rows] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.product.findMany({
      where: slot ? { category: { slug: slot } } : {},
      include: { category: true },
      orderBy: [{ category: { order: "asc" } }, { priceUzs: "asc" }],
    }),
  ]);
  const needle = q.trim().toLowerCase();
  const products = rows.filter((p) => !needle || `${p.brand} ${p.name}`.toLowerCase().includes(needle));
  const href = (value?: string) => {
    const params = new URLSearchParams();
    if (value) params.set("category", value);
    if (q) params.set("q", q);
    const query = params.toString();
    return adminHref(config, `/products${query ? `?${query}` : ""}`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Товары</h1>
        <Link href={adminHref(config, `/products/new?category=${slot ?? "cpu"}`)} className="btn btn-primary" data-testid="new-product">Добавить товар</Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
        <Link href={href()} className={`rounded-lg border border-line px-3 py-1.5 ${!slot ? "bg-raised text-signal" : "text-muted"}`}>Все</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={href(c.slug)} className={`rounded-lg border border-line px-3 py-1.5 ${slot === c.slug ? "bg-raised text-signal" : "text-muted"}`}>{c.nameRu}</Link>
        ))}
      </nav>

      <form method="get" action={adminHref(config, "/products")} className="mt-3 flex max-w-md gap-2">
        {slot && <input type="hidden" name="category" value={slot} />}
        <input type="search" name="q" defaultValue={q} placeholder="Поиск по названию" aria-label="Поиск по названию" className="field" />
        <button type="submit" className="btn btn-ghost">Найти</button>
      </form>

      <p className="mt-3 text-sm text-muted">Найдено: {products.length}. Цену и остаток можно менять прямо в таблице.</p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-panel text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Товар</th>
              <th className="px-3 py-2 font-medium">Цена, сум</th>
              <th className="px-3 py-2 font-medium">Остаток</th>
              <th className="px-3 py-2" aria-label="Сохранить" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const formId = `row-${product.id}`;
              return (
                <tr key={product.id} className={`border-t border-line ${product.active ? "" : "opacity-60"}`} data-product={product.slug}>
                  <td className="px-3 py-2">
                    <Link href={adminHref(config, `/products/${product.id}`)} className="font-semibold underline hover:text-signal">{product.brand} {product.name}</Link>
                    <span className="block text-xs text-muted">{product.category.nameRu}{product.active ? "" : " · скрыт"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <input form={formId} name="priceUzs" defaultValue={product.priceUzs} inputMode="numeric" required aria-label={`Цена: ${product.name}`} className="field !w-36 font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <input form={formId} name="stock" defaultValue={product.stock} inputMode="numeric" required aria-label={`Остаток: ${product.name}`} className="field !w-20 font-mono" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <form id={formId} action={quickUpdateProduct} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={product.id} />
                      {slot && <input type="hidden" name="category" value={slot} />}
                      {q && <input type="hidden" name="q" value={q} />}
                      <button type="submit" className="btn btn-ghost">Сохранить</button>
                      {saved === String(product.id) && <span className="text-good" data-testid="row-saved">✓</span>}
                      {error === String(product.id) && <span className="text-danger" data-testid="row-error">Проверьте значения</span>}
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
