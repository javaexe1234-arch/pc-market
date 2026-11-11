import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/format";
import type { Slot } from "@/lib/specs";
import { PartIcon } from "./PartIcon";

interface CategoryItem {
  slug: string;
  nameRu: string;
  nameUz: string;
  _count: { products: number };
}

export function CategoryGrid({ categories }: { categories: CategoryItem[] }) {
  const locale = useLocale();
  const t = useTranslations("home");
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/catalog/${category.slug}`}
          className="group rounded-xl border border-line bg-panel p-4 transition-colors hover:border-signal"
        >
          <PartIcon slot={category.slug as Slot} className="h-10 w-10 text-muted transition-colors group-hover:text-signal" />
          <h3 className="mt-3 font-semibold">{localized(locale, category.nameRu, category.nameUz)}</h3>
          <p className="mt-1 text-sm text-muted">{t("itemsCount", { count: category._count.products })}</p>
        </Link>
      ))}
    </div>
  );
}
