import { describe, expect, it } from "vitest";
import { resolveBuild, selectionFromQuery, selectionToQuery } from "../src/lib/build-selection";
import { filterOptions, filterParts, parseQuery } from "../src/lib/catalog-filter";
import { formatUzs } from "../src/lib/format";
import { part } from "./helpers";

describe("build link", () => {
  it("round-trips a selection", () => {
    const selection = { cpu: 4, gpu: 9, storage: [2, 3] };
    expect(selectionFromQuery(selectionToQuery(selection))).toEqual(selection);
  });
  it("returns null without a build, and ignores invalid ids", () => {
    expect(selectionFromQuery("")).toBeNull();
    expect(selectionFromQuery("cpu=abc&utm=1")).toBeNull();
  });
  it("drops unknown ids and parts from the wrong slot", () => {
    const cpu = part("cpu");
    const gpu = part("gpu");
    const build = resolveBuild({ cpu: gpu.id, gpu: gpu.id, ram: 99999, storage: [cpu.id] }, [cpu, gpu]);
    expect(build.cpu).toBeUndefined();
    expect(build.gpu?.id).toBe(gpu.id);
    expect(build.ram).toBeUndefined();
    expect(build.storage).toEqual([]);
  });
});

describe("catalog filter", () => {
  const am5 = { ...part("cpu", { socket: "AM5" }), brand: "AMD", name: "Alpha", priceUzs: 300 };
  const lga = { ...part("cpu", { socket: "LGA1700" }), brand: "Intel", name: "Beta", priceUzs: 100 };
  const parts = [am5, lga];

  it("filters by text, brand, price and spec", () => {
    expect(filterParts(parts, parseQuery("cpu", { q: "alph" }))).toEqual([am5]);
    expect(filterParts(parts, parseQuery("cpu", { brand: "Intel" }))).toEqual([lga]);
    expect(filterParts(parts, parseQuery("cpu", { min: "200" }))).toEqual([am5]);
    expect(filterParts(parts, parseQuery("cpu", { max: "200" }))).toEqual([lga]);
    expect(filterParts(parts, parseQuery("cpu", { socket: ["AM5", "AM4"] }))).toEqual([am5]);
  });
  it("sorts by price by default and honours the sort option", () => {
    expect(filterParts(parts, parseQuery("cpu", {}))[0]).toBe(lga);
    expect(filterParts(parts, parseQuery("cpu", { sort: "price-desc" }))[0]).toBe(am5);
    expect(filterParts(parts, parseQuery("cpu", { sort: "name" }))[0]).toBe(am5);
  });
  it("tolerates junk parameters", () => {
    const q = parseQuery("cpu", { page: "-3", min: "abc", sort: "drop table" });
    expect(q).toMatchObject({ page: 1, min: undefined, sort: "price-asc" });
  });
  it("lists options from array specs without duplicates", () => {
    const coolers = [part("cooler", { sockets: ["AM4", "AM5"] }), part("cooler", { sockets: ["AM5"] })];
    expect(filterOptions("cooler", coolers).find((o) => o.key === "sockets")?.values).toEqual(["AM4", "AM5"]);
  });
});

describe("formatUzs", () => {
  it("groups digits and uses the locale's currency name", () => {
    expect(formatUzs(12500000, "ru")).toBe("12 500 000 сум");
    expect(formatUzs(12500000, "uz")).toBe("12 500 000 so'm");
  });
});
