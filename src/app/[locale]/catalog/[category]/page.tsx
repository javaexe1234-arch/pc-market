import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { FilterForm } from "@/components/FilterForm";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import { getCategory, getParts } from "@/lib/catalog";
import { filterOptions, filterParts, PAGE_SIZE, parseQuery } from "@/lib/catalog-filter";
import { localized } from "@/lib/format";
import { specFilterValue, Translators } from "@/lib/part-format";
import type { Slot } from "@/lib/specs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function CheckGroup({ legend, name, options, selected }: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="space-y-1.5">
        {options.map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-text">
            <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="h-4 w-4 accent-signal" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const slot = category.slug as Slot;

  const [t, tSpecs, tNav, tUnits, tValues] = await Promise.all([
    getTranslations("catalog"), getTranslations("specs"), getTranslations("nav"), getTranslations("units"), getTranslations("values"),
  ]);
  const translators: Translators = { units: (k) => tUnits(k), values: (k) => tValues(k) };

  const raw = await searchParams;
  const query = parseQuery(slot, raw);
  const all = await getParts(slot);
  const matched = filterParts(all, query);
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const brands = [...new Set(all.map((p) => p.brand))].sort();
  const path = `/catalog/${slot}`;
  const pageLink = (target: number) => ({
    pathname: path,
    query: { ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Record<string, string | string[]>, page: String(target) },
  });

  return (
    <>
      <nav className="mb-2 text-sm text-muted">
        <Link href="/catalog" className="hover:text-text">{tNav("catalog")}</Link>
        <span className="mx-2">/</span>
        <span>{localized(locale, category.nameRu, category.nameUz)}</span>
      </nav>
      <h1 className="mb-6 text-3xl font-extrabold">{localized(locale, category.nameRu, category.nameUz)}</h1>

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside>
          {/* The key remounts the form so its defaults follow the URL after "reset". */}
          <details open className="rounded-xl border border-line bg-panel p-4">
            <summary className="cursor-pointer font-semibold lg:hidden">{t("filters")}</summary>
            <FilterForm key={JSON.stringify(raw)} action={`/${locale}${path}`} className="mt-3 space-y-5 lg:mt-0">
              <label className="block text-sm font-semibold">
                {t("search")}
                <input type="search" name="q" defaultValue={query.q} className="field mt-2 font-normal" />
              </label>
              <label className="block text-sm font-semibold">
                {t("sort")}
                <select name="sort" defaultValue={query.sort} className="field mt-2 font-normal">
                  <option value="price-asc">{t("sortPriceAsc")}</option>
                  <option value="price-desc">{t("sortPriceDesc")}</option>
                  <option value="name">{t("sortName")}</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-semibold">
                  {t("priceFrom")}
                  <input type="number" min="0" step="1000" name="min" defaultValue={query.min} className="field mt-2 font-normal" />
                </label>
                <label className="block text-sm font-semibold">
                  {t("priceTo")}
                  <input type="number" min="0" step="1000" name="max" defaultValue={query.max} className="field mt-2 font-normal" />
                </label>
              </div>
              <CheckGroup
                legend={t("brand")}
                name="brand"
                options={brands.map((b) => ({ value: b, label: b }))}
                selected={query.brands}
              />
              {filterOptions(slot, all).map(({ key, values }) => (
                <CheckGroup
                  key={key}
                  legend={tSpecs(key as never)}
                  name={key}
                  options={values.map((value) => ({ value, label: specFilterValue(key, value, translators) }))}
                  selected={query.spec[key] ?? []}
                />
              ))}
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">{t("apply")}</button>
                <Link href={path} className="btn btn-ghost">{t("reset")}</Link>
              </div>
            </FilterForm>
          </details>
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted" aria-live="polite">{t("found", { count: matched.length })}</p>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel p-8 text-center text-muted">{t("empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((part) => <ProductCard key={part.id} part={part} />)}
            </div>
          )}
          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-between gap-3 text-sm">
              {page > 1 ? <Link href={pageLink(page - 1)} className="btn btn-ghost">{t("prev")}</Link> : <span />}
              <span className="text-muted">{t("page", { page, total: totalPages })}</span>
              {page < totalPages ? <Link href={pageLink(page + 1)} className="btn btn-ghost">{t("next")}</Link> : <span />}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
