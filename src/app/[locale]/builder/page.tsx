import { getTranslations } from "next-intl/server";
import { Builder } from "@/components/builder/Builder";
import { getGames, getParts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const t = await getTranslations("builder");
  const [parts, games] = await Promise.all([getParts(), getGames()]);
  return (
    <>
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 mb-6 text-muted">{t("lead")}</p>
      <Builder parts={parts} games={games} />
    </>
  );
}
