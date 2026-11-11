import { getTranslations } from "next-intl/server";
import { CategoryGrid } from "@/components/CategoryGrid";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const t = await getTranslations("catalog");
  const categories = await getCategories();
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">{t("title")}</h1>
      <CategoryGrid categories={categories} />
    </>
  );
}
