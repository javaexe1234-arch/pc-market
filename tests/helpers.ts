import type { Part, Slot, SpecsBySlot } from "../src/lib/specs";

const DEFAULTS: SpecsBySlot = {
  cpu: { socket: "AM5", cores: 6, threads: 12, boostGhz: 5, tdp: 105, powerW: 140, memoryTypes: ["DDR5"], cpuIndex: 100, igpuIndex: 5 },
  motherboard: { socket: "AM5", chipset: "B650", formFactor: "ATX", memoryType: "DDR5", ramSlots: 4, maxRamGb: 192, maxRamMhz: 6400, m2Slots: 2, sataPorts: 4 },
  ram: { memoryType: "DDR5", mhz: 6000, modules: 2, moduleGb: 16, totalGb: 32 },
  gpu: { chip: "RTX 4070", vramGb: 12, lengthMm: 260, tdp: 200, gpuIndex: 100, minPsuW: 650 },
  storage: { interface: "nvme", kind: "ssd", capacityGb: 1000, readMbps: 5000 },
  psu: { watts: 750, rating: "Gold", modular: true },
  cooler: { type: "air", sockets: ["AM4", "AM5", "LGA1700"], heightMm: 155, radiatorMm: 0, tdpRating: 220 },
  case: { formFactors: ["ATX", "mATX", "ITX"], maxGpuMm: 360, maxCoolerMm: 165, maxRadiatorMm: 360, color: "black" },
};

let nextId = 1;
export function part<S extends Slot>(slot: S, specs: Partial<SpecsBySlot[S]> = {}): Part<S> {
  const id = nextId++;
  return {
    id,
    slug: `${slot}-${id}`,
    slot,
    brand: "T",
    name: `${slot} ${id}`,
    descRu: "",
    descUz: "",
    priceUzs: 1,
    stock: 1,
    specs: { ...DEFAULTS[slot], ...specs },
  };
}
