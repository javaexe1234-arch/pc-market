import { useTranslations } from "next-intl";
import type { Translators } from "@/lib/part-format";

/** Translators for spec units and values, for client and server components alike. */
export function useSpecTranslators(): Translators {
  const units = useTranslations("units");
  const values = useTranslations("values");
  return { units: (key) => units(key), values: (key) => values(key) };
}
