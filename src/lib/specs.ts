/** Product specification shapes, one per catalog category. Stored as JSON in Product.specs. */
export const SLOTS = ["cpu", "motherboard", "ram", "gpu", "storage", "psu", "cooler", "case"] as const;
export type Slot = (typeof SLOTS)[number];

export type MemoryType = "DDR4" | "DDR5";
export type FormFactor = "ATX" | "mATX" | "ITX";

export interface CpuSpecs {
  socket: string;
  cores: number;
  threads: number;
  boostGhz: number;
  tdp: number;
  /** Peak package power, used for the PSU load estimate. */
  powerW: number;
  memoryTypes: MemoryType[];
  /** Relative gaming performance; Ryzen 5 7600X = 100. */
  cpuIndex: number;
  /** Integrated graphics performance on the GPU scale; 0 when the CPU has none. */
  igpuIndex: number;
}

export interface MotherboardSpecs {
  socket: string;
  chipset: string;
  formFactor: FormFactor;
  memoryType: MemoryType;
  ramSlots: number;
  maxRamGb: number;
  maxRamMhz: number;
  m2Slots: number;
  sataPorts: number;
}

export interface RamSpecs {
  memoryType: MemoryType;
  mhz: number;
  modules: number;
  moduleGb: number;
  totalGb: number;
}

export interface GpuSpecs {
  chip: string;
  vramGb: number;
  lengthMm: number;
  tdp: number;
  /** Relative raster performance; GeForce RTX 4070 = 100. */
  gpuIndex: number;
  minPsuW: number;
}

export interface StorageSpecs {
  interface: "nvme" | "sata";
  kind: "ssd" | "hdd";
  capacityGb: number;
  readMbps: number;
}

export interface PsuSpecs {
  watts: number;
  rating: string;
  modular: boolean;
}

export interface CoolerSpecs {
  type: "air" | "aio";
  sockets: string[];
  /** Height above the CPU for air coolers; 0 for liquid coolers. */
  heightMm: number;
  /** Radiator size for liquid coolers; 0 for air coolers. */
  radiatorMm: number;
  tdpRating: number;
}

export interface CaseSpecs {
  formFactors: FormFactor[];
  maxGpuMm: number;
  maxCoolerMm: number;
  maxRadiatorMm: number;
  color: "black" | "white";
}

export interface SpecsBySlot {
  cpu: CpuSpecs;
  motherboard: MotherboardSpecs;
  ram: RamSpecs;
  gpu: GpuSpecs;
  storage: StorageSpecs;
  psu: PsuSpecs;
  cooler: CoolerSpecs;
  case: CaseSpecs;
}

/** A product as the app uses it: plain, serializable, safe to pass to client components. */
export interface Part<S extends Slot = Slot> {
  id: number;
  slug: string;
  slot: S;
  brand: string;
  name: string;
  descRu: string;
  descUz: string;
  priceUzs: number;
  stock: number;
  specs: SpecsBySlot[S];
}

/** Specs shown on product pages, in display order, with an optional unit translation key. */
export const SPEC_DISPLAY: { [S in Slot]: { key: keyof SpecsBySlot[S] & string; unit?: string }[] } = {
  cpu: [
    { key: "socket" },
    { key: "cores" },
    { key: "threads" },
    { key: "boostGhz", unit: "ghz" },
    { key: "tdp", unit: "w" },
    { key: "memoryTypes" },
    { key: "igpuIndex" },
    { key: "cpuIndex" },
  ],
  motherboard: [
    { key: "socket" },
    { key: "chipset" },
    { key: "formFactor" },
    { key: "memoryType" },
    { key: "ramSlots" },
    { key: "maxRamGb", unit: "gb" },
    { key: "maxRamMhz", unit: "mhz" },
    { key: "m2Slots" },
    { key: "sataPorts" },
  ],
  ram: [
    { key: "memoryType" },
    { key: "totalGb", unit: "gb" },
    { key: "modules" },
    { key: "moduleGb", unit: "gb" },
    { key: "mhz", unit: "mhz" },
  ],
  gpu: [
    { key: "chip" },
    { key: "vramGb", unit: "gb" },
    { key: "lengthMm", unit: "mm" },
    { key: "tdp", unit: "w" },
    { key: "minPsuW", unit: "w" },
    { key: "gpuIndex" },
  ],
  storage: [
    { key: "kind" },
    { key: "interface" },
    { key: "capacityGb", unit: "gb" },
    { key: "readMbps", unit: "mbps" },
  ],
  psu: [{ key: "watts", unit: "w" }, { key: "rating" }, { key: "modular" }],
  cooler: [
    { key: "type" },
    { key: "sockets" },
    { key: "heightMm", unit: "mm" },
    { key: "radiatorMm", unit: "mm" },
    { key: "tdpRating", unit: "w" },
  ],
  case: [
    { key: "formFactors" },
    { key: "maxGpuMm", unit: "mm" },
    { key: "maxCoolerMm", unit: "mm" },
    { key: "maxRadiatorMm", unit: "mm" },
    { key: "color" },
  ],
};

/** Spec filters offered on each catalog page. */
export const SPEC_FILTERS: { [S in Slot]: (keyof SpecsBySlot[S] & string)[] } = {
  cpu: ["socket", "cores"],
  motherboard: ["socket", "formFactor", "memoryType"],
  ram: ["memoryType", "totalGb"],
  gpu: ["vramGb"],
  storage: ["kind", "interface", "capacityGb"],
  psu: ["watts"],
  cooler: ["type", "sockets"],
  case: ["formFactors", "color"],
};
