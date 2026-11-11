import type { Part, SpecsBySlot } from "./specs";

type Translate = (key: string) => string;

export interface Translators {
  units: Translate;
  values: Translate;
}

const VALUE_KEYS = new Set(["air", "aio", "black", "white", "nvme", "sata", "ssd", "hdd"]);

function capacity(gb: number, units: Translate) {
  return gb >= 1000 ? `${gb / 1000} ${units("tb")}` : `${gb} ${units("gb")}`;
}

/** Formats one spec value for display. */
export function formatSpec(key: string, value: unknown, unit: string | undefined, t: Translators): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return t.values(value ? "yes" : "no");
  if (key === "capacityGb") return capacity(Number(value), t.units);
  if (value === 0 && (key === "igpuIndex" || key === "heightMm" || key === "radiatorMm" || key === "maxRadiatorMm")) {
    return t.values("none");
  }
  if (typeof value === "string" && VALUE_KEYS.has(value)) return t.values(value);
  return unit ? `${value} ${t.units(unit)}` : String(value);
}

/** One line of the specs that matter most when comparing parts of a category. */
export function keySpecs(part: Part, t: Translators): string {
  const { units: u } = t;
  const line = (...items: (string | number)[]) => items.join(" · ");
  switch (part.slot) {
    case "cpu": {
      const s = part.specs as SpecsBySlot["cpu"];
      return line(s.socket, `${s.cores}/${s.threads}`, `${s.boostGhz} ${u("ghz")}`, `${s.tdp} ${u("w")}`);
    }
    case "motherboard": {
      const s = part.specs as SpecsBySlot["motherboard"];
      return line(s.socket, s.formFactor, s.memoryType, `${s.chipset}`);
    }
    case "ram": {
      const s = part.specs as SpecsBySlot["ram"];
      return line(s.memoryType, `${s.totalGb} ${u("gb")}`, `${s.mhz} ${u("mhz")}`);
    }
    case "gpu": {
      const s = part.specs as SpecsBySlot["gpu"];
      return line(`${s.vramGb} ${u("gb")}`, `${s.lengthMm} ${u("mm")}`, `${s.tdp} ${u("w")}`);
    }
    case "storage": {
      const s = part.specs as SpecsBySlot["storage"];
      return line(t.values(s.interface), t.values(s.kind), capacity(s.capacityGb, u));
    }
    case "psu": {
      const s = part.specs as SpecsBySlot["psu"];
      return line(`${s.watts} ${u("w")}`, s.rating);
    }
    case "cooler": {
      const s = part.specs as SpecsBySlot["cooler"];
      const size = s.type === "aio" ? `${s.radiatorMm} ${u("mm")}` : `${s.heightMm} ${u("mm")}`;
      return line(t.values(s.type), size, `${s.tdpRating} ${u("w")}`);
    }
    case "case": {
      const s = part.specs as SpecsBySlot["case"];
      return line(s.formFactors.join("/"), `GPU ${s.maxGpuMm} ${u("mm")}`, t.values(s.color));
    }
  }
}

/** Label for one option of a catalog spec filter. */
export const specFilterValue = (key: string, value: string, t: Translators) => {
  if (key === "capacityGb") return capacity(Number(value), t.units);
  if (key === "vramGb" || key === "totalGb") return `${value} ${t.units("gb")}`;
  if (key === "watts") return `${value} ${t.units("w")}`;
  return VALUE_KEYS.has(value) ? t.values(value) : value;
};
