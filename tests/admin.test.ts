import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCTS } from "../prisma/seed/products";
import { GAMES } from "../prisma/seed/games";
import { adminConfig } from "../src/lib/admin-config";
import { createSession, isValidSession, passwordMatches, SESSION_HOURS } from "../src/lib/admin-session";
import { parseGameForm, parsePrice, parseProductForm, parseStock, slugify } from "../src/lib/admin-validation";
import { parseSpecs, specFieldName, specsToValues } from "../src/lib/spec-schema";
import { Slot, SLOTS } from "../src/lib/specs";

const CONFIG = { path: "a".repeat(20), password: "correct horse battery" };

describe("adminConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stays off until a long path and password are set", () => {
    vi.stubEnv("ADMIN_PATH", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(adminConfig()).toBeNull();
    vi.stubEnv("ADMIN_PATH", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "long-enough-password");
    expect(adminConfig()).toBeNull();
    vi.stubEnv("ADMIN_PATH", "a".repeat(20));
    vi.stubEnv("ADMIN_PASSWORD", "short");
    expect(adminConfig()).toBeNull();
    vi.stubEnv("ADMIN_PATH", "../../etc/passwd/aaaaaa");
    vi.stubEnv("ADMIN_PASSWORD", "long-enough-password");
    expect(adminConfig()).toBeNull();
    vi.stubEnv("ADMIN_PATH", "a".repeat(20));
    expect(adminConfig()).toEqual({ path: "a".repeat(20), password: "long-enough-password" });
  });
});

describe("admin session", () => {
  it("checks the password", () => {
    expect(passwordMatches("correct horse battery", CONFIG)).toBe(true);
    expect(passwordMatches("wrong", CONFIG)).toBe(false);
    expect(passwordMatches("", CONFIG)).toBe(false);
  });

  it("accepts its own session until it expires", () => {
    const session = createSession(CONFIG, 1000);
    expect(isValidSession(session, CONFIG, 1001)).toBe(true);
    expect(isValidSession(session, CONFIG, 1000 + SESSION_HOURS * 3600 * 1000 + 1)).toBe(false);
  });

  it("rejects forged and malformed sessions", () => {
    const session = createSession(CONFIG, 1000);
    const [, signature] = session.split(".");
    expect(isValidSession(`99999999999999.${signature}`, CONFIG, 1001)).toBe(false);
    expect(isValidSession(`${session}x`, CONFIG, 1001)).toBe(false);
    expect(isValidSession(`${session}.extra`, CONFIG, 1001)).toBe(false);
    expect(isValidSession("", CONFIG)).toBe(false);
    expect(isValidSession(undefined, CONFIG)).toBe(false);
    expect(isValidSession("abc.def", CONFIG)).toBe(false);
  });

  it("signs everyone out when the password changes", () => {
    const session = createSession(CONFIG, 1000);
    expect(isValidSession(session, { ...CONFIG, password: "another long password" }, 1001)).toBe(false);
  });
});

describe("spec forms", () => {
  it.each(SLOTS.map((slot) => [slot]))("reads back every seeded %s unchanged", (slot: Slot) => {
    for (const row of PRODUCTS[slot]) {
      const specs = row.specs as unknown as Record<string, unknown>;
      const parsed = parseSpecs(slot, specsToValues(slot, specs));
      expect(parsed.errors).toEqual({});
      expect(parsed.specs).toEqual(specs);
    }
  });

  it("computes total memory from the modules", () => {
    const { specs } = parseSpecs("ram", {
      spec_memoryType: "DDR5", spec_mhz: "6000", spec_modules: "2", spec_moduleGb: "16",
    });
    expect(specs.totalGb).toBe(32);
  });

  it("reports missing and out-of-range values", () => {
    const { errors } = parseSpecs("gpu", { spec_chip: "", spec_vramGb: "abc", spec_lengthMm: "5000", spec_tdp: "1.5" });
    expect(Object.keys(errors).sort()).toEqual(
      ["chip", "vramGb", "lengthMm", "tdp", "gpuIndex", "minPsuW"].map(specFieldName).sort(),
    );
  });

  it("ignores options that aren't on the list", () => {
    const { errors } = parseSpecs("case", { spec_formFactors: ["<script>"] });
    expect(errors[specFieldName("formFactors")]).toBeDefined();
  });

});

describe("product form", () => {
  const base = {
    brand: "B", name: "N", descRu: "r", descUz: "u", priceUzs: "2 700 000", stock: "3", active: "on",
    ...specsToValues("psu", { watts: 750, rating: "Gold", modular: true }),
  };

  it("parses prices typed with spaces", () => {
    const { data, errors } = parseProductForm("psu", base);
    expect(errors).toEqual({});
    expect(data).toMatchObject({ priceUzs: 2_700_000, stock: 3, active: true, specs: { watts: 750, modular: true } });
  });

  it("refuses bad prices and stock", () => {
    expect(parsePrice("0")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("1.5")).toBeNull();
    expect(parsePrice("9999999999")).toBeNull();
    expect(parseStock("0")).toBe(0);
    expect(parseProductForm("psu", { ...base, priceUzs: "abc" }).errors.priceUzs).toBeDefined();
    expect(parseProductForm("psu", { ...base, priceUzs: "abc" }).data).toBeNull();
  });

  it("treats an unticked box as hidden", () => {
    const { active: _active, ...rest } = base;
    expect(parseProductForm("psu", rest).data?.active).toBe(false);
  });

  it("makes URL-safe slugs", () => {
    expect(slugify("be quiet! Pure Power 12 M")).toBe("be-quiet-pure-power-12-m");
  });
});

describe("game form", () => {
  const toValues = (game: (typeof GAMES)[number]) =>
    Object.fromEntries(Object.entries(game).map(([k, v]) => [k, String(v)]));

  it("accepts every seeded game", () => {
    for (const game of GAMES) expect(parseGameForm(toValues(game)).errors).toEqual({});
  });

  it("refuses more FPS on heavier settings, or less memory", () => {
    const values = toValues(GAMES[0]);
    expect(parseGameForm({ ...values, fpsUltra: "500" }).errors.fpsUltra).toBeDefined();
    expect(parseGameForm({ ...values, vramUltra: "1" }).errors.vramUltra).toBeDefined();
  });

  it("requires a name and numbers", () => {
    const { errors, data } = parseGameForm({});
    expect(data).toBeNull();
    expect(errors.name).toBeDefined();
    expect(errors.fpsLow).toBeDefined();
  });
});
