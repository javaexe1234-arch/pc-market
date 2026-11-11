import { getTranslations } from "next-intl/server";
import { CartView } from "@/components/checkout/CartView";
import { getParts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const t = await getTranslations("cart");
  const parts = await getParts();
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">{t("title")}</h1>
      <CartView parts={parts} />
    </>
  );
}
