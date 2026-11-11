import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-5xl font-semibold text-signal">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <Link href="/" className="btn btn-ghost mt-6">{t("back")}</Link>
    </div>
  );
}
