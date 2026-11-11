import { FormErrors, FormValues, parseSpecs } from "./spec-schema";
import type { Slot } from "./specs";

const MAX_PRICE = 2_000_000_000;
const MAX_STOCK = 1_000_000;

const text = (values: FormValues, name: string) => {
  const value = values[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};

/** Accepts prices typed with spaces, such as "2 700 000". */
export function parseWhole(raw: string, min: number, max: number): number | null {
  const cleaned = raw.replace(/[\s ]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= min && value <= max ? value : null;
}

export const parsePrice = (raw: string) => parseWhole(raw, 1, MAX_PRICE);
export const parseStock = (raw: string) => parseWhole(raw, 0, MAX_STOCK);

export interface ProductInput {
  brand: string;
  name: string;
  descRu: string;
  descUz: string;
  priceUzs: number;
  stock: number;
  active: boolean;
  specs: Record<string, unknown>;
}

export function parseProductForm(slot: Slot, values: FormValues): { data: ProductInput | null; errors: FormErrors } {
  const { specs, errors } = parseSpecs(slot, values);
  const required = (name: string, max: number) => {
    const value = text(values, name);
    if (!value) errors[name] = "Заполните поле.";
    else if (value.length > max) errors[name] = `Не больше ${max} символов.`;
    return value;
  };

  const brand = required("brand", 60);
  const name = required("name", 150);
  const descRu = required("descRu", 2000);
  const descUz = required("descUz", 2000);
  const priceUzs = parsePrice(text(values, "priceUzs"));
  if (priceUzs === null) errors.priceUzs = "Укажите цену в сумах, целым числом больше нуля.";
  const stock = parseStock(text(values, "stock"));
  if (stock === null) errors.stock = "Укажите количество, целым числом от 0.";

  if (Object.keys(errors).length > 0 || priceUzs === null || stock === null) return { data: null, errors };
  return {
    data: { brand, name, descRu, descUz, priceUzs, stock, active: text(values, "active") === "on", specs },
    errors,
  };
}

export const FPS_FIELDS = [
  { key: "fpsLow", label: "FPS на низких" },
  { key: "fpsMedium", label: "FPS на средних" },
  { key: "fpsHigh", label: "FPS на высоких" },
  { key: "fpsUltra", label: "FPS на ультра" },
] as const;

export const VRAM_FIELDS = [
  { key: "vramLow", label: "Видеопамять на низких, ГБ" },
  { key: "vramMedium", label: "Видеопамять на средних, ГБ" },
  { key: "vramHigh", label: "Видеопамять на высоких, ГБ" },
  { key: "vramUltra", label: "Видеопамять на ультра, ГБ" },
] as const;

export interface GameInput {
  name: string;
  year: number;
  fpsLow: number;
  fpsMedium: number;
  fpsHigh: number;
  fpsUltra: number;
  cpuFps: number;
  ramGb: number;
  vramLow: number;
  vramMedium: number;
  vramHigh: number;
  vramUltra: number;
  active: boolean;
}

/** Heavier settings can't give more FPS or need less memory; the FPS table relies on that. */
export function parseGameForm(values: FormValues): { data: GameInput | null; errors: FormErrors } {
  const errors: FormErrors = {};
  const number = (name: string, min: number, max: number) => {
    const value = parseWhole(text(values, name), min, max);
    if (value === null) errors[name] = `Целое число от ${min} до ${max}.`;
    return value ?? 0;
  };

  const name = text(values, "name");
  if (!name) errors.name = "Заполните поле.";
  else if (name.length > 100) errors.name = "Не больше 100 символов.";

  const year = number("year", 1980, 2100);
  const fps = FPS_FIELDS.map(({ key }) => number(key, 1, 2000));
  const cpuFps = number("cpuFps", 1, 2000);
  const ramGb = number("ramGb", 1, 512);
  const vram = VRAM_FIELDS.map(({ key }) => number(key, 0, 128));

  FPS_FIELDS.forEach(({ key }, i) => {
    if (i > 0 && !errors[key] && !errors[FPS_FIELDS[i - 1].key] && fps[i] > fps[i - 1]) {
      errors[key] = "Не может быть больше, чем на настройках ниже.";
    }
  });
  VRAM_FIELDS.forEach(({ key }, i) => {
    if (i > 0 && !errors[key] && !errors[VRAM_FIELDS[i - 1].key] && vram[i] < vram[i - 1]) {
      errors[key] = "Не может быть меньше, чем на настройках ниже.";
    }
  });

  if (Object.keys(errors).length > 0) return { data: null, errors };
  return {
    data: {
      name,
      year,
      fpsLow: fps[0],
      fpsMedium: fps[1],
      fpsHigh: fps[2],
      fpsUltra: fps[3],
      cpuFps,
      ramGb,
      vramLow: vram[0],
      vramMedium: vram[1],
      vramHigh: vram[2],
      vramUltra: vram[3],
      active: text(values, "active") === "on",
    },
    errors,
  };
}

export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
