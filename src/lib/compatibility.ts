import type { Part, Slot } from "./specs";

/** One chosen part per slot; storage may hold several drives. */
export interface Build {
  cpu?: Part<"cpu">;
  motherboard?: Part<"motherboard">;
  ram?: Part<"ram">;
  gpu?: Part<"gpu">;
  storage: Part<"storage">[];
  psu?: Part<"psu">;
  cooler?: Part<"cooler">;
  case?: Part<"case">;
}

export interface Issue {
  /** Translation key under `compat`. */
  code: string;
  level: "error" | "warning";
  /** Slots involved; used to explain why a candidate part does not fit. */
  slots: Slot[];
  params?: Record<string, string | number>;
}

/** Allowance for motherboard, memory and fans in the load estimate. */
const BASE_LOAD_W = 50;
const DRIVE_LOAD_W = 5;
const PSU_HEADROOM = 1.25;
const REQUIRED = ["cpu", "motherboard", "ram", "psu", "cooler", "case"] as const;

export function estimateLoadW(build: Build): number {
  if (!build.cpu && !build.gpu) return 0;
  return (
    BASE_LOAD_W +
    (build.cpu?.specs.powerW ?? 0) +
    (build.gpu?.specs.tdp ?? 0) +
    build.storage.length * DRIVE_LOAD_W
  );
}

export function checkBuild(build: Build): Issue[] {
  const issues: Issue[] = [];
  const error = (code: string, slots: Slot[], params?: Issue["params"]) =>
    issues.push({ code, level: "error", slots, params });
  const warn = (code: string, slots: Slot[], params?: Issue["params"]) =>
    issues.push({ code, level: "warning", slots, params });

  const { cpu, motherboard: board, ram, gpu, storage, psu, cooler, case: pcCase } = build;

  for (const slot of REQUIRED) {
    if (!build[slot]) error("missing", [slot], { slot });
  }
  if (storage.length === 0) error("missing", ["storage"], { slot: "storage" });
  if (cpu && !gpu && cpu.specs.igpuIndex === 0) error("noGraphics", ["gpu", "cpu"]);

  if (cpu && board && cpu.specs.socket !== board.specs.socket) {
    error("cpuSocket", ["cpu", "motherboard"], { cpu: cpu.specs.socket, board: board.specs.socket });
  }
  if (cpu && cooler && !cooler.specs.sockets.includes(cpu.specs.socket)) {
    error("coolerSocket", ["cooler", "cpu"], { socket: cpu.specs.socket });
  }

  if (ram && board) {
    if (ram.specs.memoryType !== board.specs.memoryType) {
      error("ramType", ["ram", "motherboard"], { ram: ram.specs.memoryType, board: board.specs.memoryType });
    } else if (ram.specs.mhz > board.specs.maxRamMhz) {
      warn("ramSpeed", ["ram", "motherboard"], { ram: ram.specs.mhz, max: board.specs.maxRamMhz });
    }
    if (ram.specs.modules > board.specs.ramSlots) {
      error("ramSlots", ["ram", "motherboard"], { modules: ram.specs.modules, slots: board.specs.ramSlots });
    }
    if (ram.specs.totalGb > board.specs.maxRamGb) {
      error("ramCapacity", ["ram", "motherboard"], { total: ram.specs.totalGb, max: board.specs.maxRamGb });
    }
  }
  if (ram && cpu && !cpu.specs.memoryTypes.includes(ram.specs.memoryType)) {
    error("ramCpuType", ["ram", "cpu"], { ram: ram.specs.memoryType, cpu: cpu.specs.memoryTypes.join("/") });
  }
  if (ram && ram.specs.modules === 1) warn("singleChannel", ["ram"]);

  if (board && pcCase && !pcCase.specs.formFactors.includes(board.specs.formFactor)) {
    error("caseFormFactor", ["case", "motherboard"], { board: board.specs.formFactor });
  }
  if (gpu && pcCase && gpu.specs.lengthMm > pcCase.specs.maxGpuMm) {
    error("gpuLength", ["gpu", "case"], { gpu: gpu.specs.lengthMm, max: pcCase.specs.maxGpuMm });
  }
  if (cooler && pcCase) {
    if (cooler.specs.type === "air" && cooler.specs.heightMm > pcCase.specs.maxCoolerMm) {
      error("coolerHeight", ["cooler", "case"], { cooler: cooler.specs.heightMm, max: pcCase.specs.maxCoolerMm });
    }
    if (cooler.specs.type === "aio" && cooler.specs.radiatorMm > pcCase.specs.maxRadiatorMm) {
      error("radiator", ["cooler", "case"], { radiator: cooler.specs.radiatorMm, max: pcCase.specs.maxRadiatorMm });
    }
  }

  if (board) {
    const nvme = storage.filter((d) => d.specs.interface === "nvme").length;
    const sata = storage.length - nvme;
    if (nvme > board.specs.m2Slots) {
      error("m2Slots", ["storage", "motherboard"], { count: nvme, slots: board.specs.m2Slots });
    }
    if (sata > board.specs.sataPorts) {
      error("sataPorts", ["storage", "motherboard"], { count: sata, ports: board.specs.sataPorts });
    }
  }

  if (psu && (cpu || gpu)) {
    const load = estimateLoadW(build);
    const slots: Slot[] = ["psu"];
    if (cpu) slots.push("cpu");
    if (gpu) slots.push("gpu");
    if (psu.specs.watts < load) {
      error("psuTooWeak", slots, { psu: psu.specs.watts, load });
    } else if (psu.specs.watts < load * PSU_HEADROOM) {
      warn("psuHeadroom", slots, { psu: psu.specs.watts, load });
    }
  }

  if (cooler && cpu && cooler.specs.tdpRating < cpu.specs.tdp) {
    warn("coolerTdp", ["cooler", "cpu"], { rating: cooler.specs.tdpRating, tdp: cpu.specs.tdp });
  }

  if (cpu && gpu) {
    if (gpu.specs.gpuIndex / cpu.specs.cpuIndex > 2) warn("cpuBottleneck", ["cpu", "gpu"]);
    else if (cpu.specs.cpuIndex / gpu.specs.gpuIndex > 2.5) warn("gpuBottleneck", ["cpu", "gpu"]);
  }

  return issues;
}

/** Puts a candidate part into a copy of the build. A drive is added; any other part replaces the slot. */
export function withPart(build: Build, part: Part): Build {
  if (part.slot === "storage") {
    const drive = part as Part<"storage">;
    return {
      ...build,
      storage: build.storage.some((d) => d.id === drive.id) ? build.storage : [...build.storage, drive],
    };
  }
  return { ...build, [part.slot]: part };
}

/** Errors the candidate part would cause in this build. An empty list means it fits. */
export function candidateIssues(build: Build, part: Part): Issue[] {
  return checkBuild(withPart(build, part)).filter(
    (issue) => issue.level === "error" && issue.code !== "missing" && issue.slots.includes(part.slot),
  );
}
