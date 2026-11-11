import { Part, Slot, SPEC_FILTERS } from "./specs";

export const PAGE_SIZE = 12;
export type SortKey = "price-asc" | "price-desc" | "name";

export interface CatalogQuery {
  q: string;
  brands: string[];
  min?: number;
  max?: number;
  sort: SortKey;
  page: number;
  spec: Record<string, string[]>;
}

type RawParams = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined) => (value === undefined ? [] : [value].flat()).filter(Boolean);
const first = (value: string | string[] | undefined) => list(value)[0] ?? "";

const positive = (value: string) => {
  const n = Number(value.replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseQuery(slot: Slot, params: RawParams): CatalogQuery {
  const sort = first(params.sort);
  const spec: Record<string, string[]> = {};
  for (const key of SPEC_FILTERS[slot]) {
    const values = list(params[key]);
    if (values.length) spec[key] = values;
  }
  return {
    q: first(params.q).trim(),
    brands: list(params.brand),
    min: positive(first(params.min)),
    max: positive(first(params.max)),
    sort: sort === "price-desc" || sort === "name" ? sort : "price-asc",
    page: Math.max(1, Math.floor(Number(first(params.page))) || 1),
    spec,
  };
}

const specValues = (part: Part, key: string) =>
  [(part.specs as unknown as Record<string, unknown>)[key]].flat().map(String);

export function filterParts(parts: Part[], query: CatalogQuery): Part[] {
  const needle = query.q.toLowerCase();
  const matched = parts.filter(
    (p) =>
      (!needle || `${p.brand} ${p.name}`.toLowerCase().includes(needle)) &&
      (query.brands.length === 0 || query.brands.includes(p.brand)) &&
      (query.min === undefined || p.priceUzs >= query.min) &&
      (query.max === undefined || p.priceUzs <= query.max) &&
      Object.entries(query.spec).every(([key, wanted]) => specValues(p, key).some((v) => wanted.includes(v))),
  );
  const byName = (a: Part, b: Part) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`);
  const compare =
    query.sort === "name" ? byName
    : query.sort === "price-desc" ? (a: Part, b: Part) => b.priceUzs - a.priceUzs
    : (a: Part, b: Part) => a.priceUzs - b.priceUzs;
  return [...matched].sort(compare);
}

/** Distinct values of each filterable spec, in natural order. */
export function filterOptions(slot: Slot, parts: Part[]): { key: string; values: string[] }[] {
  return SPEC_FILTERS[slot].map((key) => ({
    key,
    values: [...new Set(parts.flatMap((p) => specValues(p, key)))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
  }));
}
