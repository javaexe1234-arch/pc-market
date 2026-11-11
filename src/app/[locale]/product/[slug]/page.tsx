import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AddToBuild } from "@/components/AddToBuild";
import { AddToCart } from "@/components/AddToCart";
import { PartIcon } from "@/components/PartIcon";
import { Link } from "@/i18n/navigation";
import { getPart } from "@/lib/catalog";
import { formatUzs, localized } from "@/lib/format";
import { formatSpec, Translators } from "@/lib/part-format";
import { SPEC_DISPLAY } from "@/lib/specs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const part = await getPart(slug);
  if (!part) notFound();

  const [t, tSpecs, tSlots, tNav, tUnits, tValues] = await Promise.all([
    getTranslations("product"), getTranslations("specs"), getTranslations("slots"), getTranslations("nav"),
    getTranslations("units"), getTranslations("values"),
  ]);
  const translators: Translators = { units: (k) => tUnits(k), values: (k) => tValues(k) };
  const specs = part.specs as unknown as Record<string, unknown>;
  const rows = SPEC_DISPLAY[part.slot] as { key: string; unit?: string }[];

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/catalog" className="hover:text-text">{tNav("catalog")}</Link>
        <span className="mx-2">/</span>
        <Link href={`/catalog/${part.slot}`} className="hover:text-text">{tSlots(part.slot)}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-line bg-panel text-muted">
          <PartIcon slot={part.slot} className="h-40 w-40" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{part.brand}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">{part.name}</h1>
          <p className="mt-3 text-muted">{localized(locale, part.descRu, part.descUz)}</p>
          <p className="mt-6 font-mono text-3xl font-semibold">{formatUzs(part.priceUzs, locale)}</p>
          <p className={`mt-1 text-sm ${part.stock > 0 ? "text-good" : "text-danger"}`}>
            {part.stock > 0 ? t("inStock", { count: part.stock }) : t("outOfStock")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCart id={part.id} inStock={part.stock > 0} />
            <AddToBuild slot={part.slot} id={part.id} />
            <Link href="/builder" className="btn btn-ghost">{t("openBuilder")}</Link>
          </div>
        </div>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="mb-3 text-xl font-bold">{t("specs")}</h2>
        <dl className="overflow-hidden rounded-xl border border-line">
          {rows.map(({ key, unit }) => (
            <div key={key} className="flex justify-between gap-6 border-b border-line px-4 py-2.5 text-sm last:border-b-0 odd:bg-panel">
              <dt className="text-muted">{tSpecs(key as never)}</dt>
              <dd className="text-right font-mono">{formatSpec(key, specs[key], unit, translators)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
