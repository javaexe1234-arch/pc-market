import type { Slot } from "./specs";

/** Describes the admin form for each category's specs, and how to read it back. */
export type SpecField = { key: string; label: string; hint?: string } & (
  | { type: "int"; min: number; max: number }
  | { type: "decimal"; min: number; max: number }
  | { type: "text" }
  | { type: "enum"; options: string[] }
  | { type: "multi"; options: string[] }
  | { type: "list" }
  | { type: "bool" }
);

const MEMORY = ["DDR4", "DDR5"];
const FORM_FACTORS = ["ATX", "mATX", "ITX"];

export const SPEC_FIELDS: Record<Slot, SpecField[]> = {
  cpu: [
    { key: "socket", label: "Сокет", type: "text", hint: "Как у материнских плат, например AM5" },
    { key: "cores", label: "Ядра", type: "int", min: 1, max: 256 },
    { key: "threads", label: "Потоки", type: "int", min: 1, max: 512 },
    { key: "boostGhz", label: "Максимальная частота, ГГц", type: "decimal", min: 0.1, max: 10 },
    { key: "tdp", label: "TDP, Вт", type: "int", min: 1, max: 1000 },
    { key: "powerW", label: "Пиковая мощность, Вт", type: "int", min: 1, max: 1000, hint: "Для расчёта блока питания" },
    { key: "memoryTypes", label: "Поддерживаемая память", type: "multi", options: MEMORY },
    { key: "cpuIndex", label: "Индекс производительности", type: "int", min: 1, max: 1000, hint: "Для расчёта FPS. Ryzen 5 7600X = 100" },
    { key: "igpuIndex", label: "Индекс встроенной графики", type: "int", min: 0, max: 1000, hint: "0, если её нет. RTX 4070 = 100" },
  ],
  motherboard: [
    { key: "socket", label: "Сокет", type: "text", hint: "Как у процессоров, например AM5" },
    { key: "chipset", label: "Чипсет", type: "text" },
    { key: "formFactor", label: "Форм-фактор", type: "enum", options: FORM_FACTORS },
    { key: "memoryType", label: "Тип памяти", type: "enum", options: MEMORY },
    { key: "ramSlots", label: "Слоты памяти", type: "int", min: 1, max: 16 },
    { key: "maxRamGb", label: "Максимум памяти, ГБ", type: "int", min: 1, max: 8192 },
    { key: "maxRamMhz", label: "Максимальная частота памяти, МГц", type: "int", min: 100, max: 20000 },
    { key: "m2Slots", label: "Разъёмы M.2", type: "int", min: 0, max: 16 },
    { key: "sataPorts", label: "Порты SATA", type: "int", min: 0, max: 32 },
  ],
  ram: [
    { key: "memoryType", label: "Тип памяти", type: "enum", options: MEMORY },
    { key: "mhz", label: "Частота, МГц", type: "int", min: 100, max: 20000 },
    { key: "modules", label: "Модулей в комплекте", type: "int", min: 1, max: 16 },
    { key: "moduleGb", label: "Объём модуля, ГБ", type: "int", min: 1, max: 1024 },
  ],
  gpu: [
    { key: "chip", label: "Графический чип", type: "text" },
    { key: "vramGb", label: "Видеопамять, ГБ", type: "int", min: 1, max: 256 },
    { key: "lengthMm", label: "Длина, мм", type: "int", min: 50, max: 600 },
    { key: "tdp", label: "Мощность, Вт", type: "int", min: 1, max: 2000 },
    { key: "gpuIndex", label: "Индекс производительности", type: "int", min: 1, max: 2000, hint: "Для расчёта FPS. RTX 4070 = 100" },
    { key: "minPsuW", label: "Рекомендуемый блок питания, Вт", type: "int", min: 1, max: 5000 },
  ],
  storage: [
    { key: "interface", label: "Интерфейс", type: "enum", options: ["nvme", "sata"] },
    { key: "kind", label: "Тип", type: "enum", options: ["ssd", "hdd"] },
    { key: "capacityGb", label: "Ёмкость, ГБ", type: "int", min: 1, max: 1000000 },
    { key: "readMbps", label: "Скорость чтения, МБ/с", type: "int", min: 1, max: 100000 },
  ],
  psu: [
    { key: "watts", label: "Мощность, Вт", type: "int", min: 1, max: 10000 },
    { key: "rating", label: "Сертификат", type: "text" },
    { key: "modular", label: "Модульные кабели", type: "bool" },
  ],
  cooler: [
    { key: "type", label: "Тип", type: "enum", options: ["air", "aio"] },
    { key: "sockets", label: "Сокеты", type: "list", hint: "Через запятую: AM4, AM5, LGA1700" },
    { key: "heightMm", label: "Высота, мм", type: "int", min: 0, max: 400, hint: "0 для жидкостного" },
    { key: "radiatorMm", label: "Радиатор, мм", type: "int", min: 0, max: 600, hint: "0 для воздушного" },
    { key: "tdpRating", label: "Рассчитан на, Вт", type: "int", min: 1, max: 2000 },
  ],
  case: [
    { key: "formFactors", label: "Форм-факторы плат", type: "multi", options: FORM_FACTORS },
    { key: "maxGpuMm", label: "Длина видеокарты до, мм", type: "int", min: 50, max: 1000 },
    { key: "maxCoolerMm", label: "Высота кулера до, мм", type: "int", min: 10, max: 500 },
    { key: "maxRadiatorMm", label: "Радиатор до, мм", type: "int", min: 0, max: 1000, hint: "0, если радиатор не ставится" },
    { key: "color", label: "Цвет", type: "enum", options: ["black", "white"] },
  ],
};

export type FormValue = string | string[];
export type FormValues = Record<string, FormValue | undefined>;
export type FormErrors = Record<string, string>;

const first = (value: FormValue | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
const many = (value: FormValue | undefined) => (value === undefined ? [] : [value].flat());

export const specFieldName = (key: string) => `spec_${key}`;

/** Reads a category's specs from form values, returning them with one message per bad field. */
export function parseSpecs(slot: Slot, values: FormValues): { specs: Record<string, unknown>; errors: FormErrors } {
  const specs: Record<string, unknown> = {};
  const errors: FormErrors = {};

  for (const field of SPEC_FIELDS[slot]) {
    const name = specFieldName(field.key);
    const raw = values[name];
    switch (field.type) {
      case "int":
      case "decimal": {
        const value = Number(first(raw).replace(",", "."));
        if (first(raw) === "" || !Number.isFinite(value)) errors[name] = "Укажите число.";
        else if (field.type === "int" && !Number.isInteger(value)) errors[name] = "Нужно целое число.";
        else if (value < field.min || value > field.max) errors[name] = `Допустимо от ${field.min} до ${field.max}.`;
        else specs[field.key] = value;
        break;
      }
      case "text": {
        const value = first(raw);
        if (!value) errors[name] = "Заполните поле.";
        else if (value.length > 60) errors[name] = "Слишком длинное значение.";
        else specs[field.key] = value;
        break;
      }
      case "enum": {
        const value = first(raw);
        if (!field.options.includes(value)) errors[name] = "Выберите значение.";
        else specs[field.key] = value;
        break;
      }
      case "multi": {
        const value = many(raw).filter((option) => field.options.includes(option));
        if (value.length === 0) errors[name] = "Выберите хотя бы одно значение.";
        else specs[field.key] = value;
        break;
      }
      case "list": {
        const value = [...new Set(many(raw).join(",").split(",").map((item) => item.trim()).filter(Boolean))];
        if (value.length === 0) errors[name] = "Укажите хотя бы одно значение.";
        else specs[field.key] = value;
        break;
      }
      case "bool":
        specs[field.key] = first(raw) === "on";
        break;
    }
  }

  if (slot === "ram" && typeof specs.modules === "number" && typeof specs.moduleGb === "number") {
    specs.totalGb = specs.modules * specs.moduleGb;
  }
  return { specs, errors };
}

/** Turns saved specs back into form values, for the edit form. */
export function specsToValues(slot: Slot, specs: Record<string, unknown>): FormValues {
  const values: FormValues = {};
  for (const field of SPEC_FIELDS[slot]) {
    const value = specs[field.key];
    const name = specFieldName(field.key);
    if (field.type === "bool") values[name] = value ? "on" : undefined;
    else if (field.type === "multi") values[name] = (value as string[]) ?? [];
    else if (field.type === "list") values[name] = ((value as string[]) ?? []).join(", ");
    else values[name] = value === undefined ? "" : String(value);
  }
  return values;
}
