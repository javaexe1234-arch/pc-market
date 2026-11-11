import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatUzs } from "@/lib/format";
import { keySpecs } from "@/lib/part-format";
import type { Part } from "@/lib/specs";
import { AddToBuild } from "./AddToBuild";
import { AddToCart } from "./AddToCart";
import { PartIcon } from "./PartIcon";
import { useSpecTranslators } from "./useFormatters";

export function ProductCard({ part }: { part: Part }) {
  const locale = useLocale();
  const t = useSpecTranslators();
  return (
    <article className="group flex flex-col rounded-xl border border-line bg-panel p-4 transition-colors hover:border-muted">
      <Link href={`/product/${part.slug}`} className="flex flex-1 flex-col">
        <div className="mb-4 flex aspect-[5/3] items-center justify-center rounded-lg bg-raised text-muted transition-colors group-hover:text-signal">
          <PartIcon slot={part.slot} className="h-16 w-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{part.brand}</p>
        <h3 className="mt-1 font-semibold leading-snug">{part.name}</h3>
        <p className="mt-2 font-mono text-xs text-muted">{keySpecs(part, t)}</p>
      </Link>
      <p className="mt-4 font-mono font-semibold">{formatUzs(part.priceUzs, locale)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <AddToCart id={part.id} inStock={part.stock > 0} />
        <AddToBuild slot={part.slot} id={part.id} />
      </div>
    </article>
  );
}
