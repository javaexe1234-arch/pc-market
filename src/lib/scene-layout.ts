import type { Build } from "./compatibility";
import type { CaseSpecs, FormFactor } from "./specs";

/**
 * Where everything sits in the 3D preview. All values are millimetres, taken from part specs.
 * Axes: x runs from the rear of the PC (-) to the front (+), y is up, z runs from the
 * motherboard tray (-) to the glass side panel (+). The origin is the centre of the case.
 */
export type Vec3 = [number, number, number];

export interface Box {
  center: Vec3;
  size: Vec3;
}

export const boxFromRange = (minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): Box => ({
  center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
  size: [maxX - minX, maxY - minY, maxZ - minZ],
});

const DEFAULT_CASE: CaseSpecs = {
  formFactors: ["ATX", "mATX", "ITX"],
  maxGpuMm: 360,
  maxCoolerMm: 165,
  maxRadiatorMm: 360,
  color: "black",
};

const CASE_HEIGHT: Record<FormFactor, number> = { ATX: 450, mATX: 380, ITX: 340 };

const BOARD_GEOMETRY: Record<FormFactor, { w: number; h: number; socketX: number; socketY: number; pcieY: number; ramX: number }> = {
  ATX: { w: 244, h: 305, socketX: 95, socketY: 85, pcieY: 165, ramX: 175 },
  mATX: { w: 244, h: 244, socketX: 95, socketY: 85, pcieY: 165, ramX: 175 },
  ITX: { w: 170, h: 170, socketX: 70, socketY: 60, pcieY: 145, ramX: 125 },
};

export const SHROUD_HEIGHT = 95;
const RAM_PITCH = 9;
const GPU_HEIGHT = 120;
const TOWER_SIZE: Vec3 = [130, 125, 0];
const STOCK_DIAMETER = 100;
const PUMP_SIZE = 60;
const PUMP_HEIGHT = 40;
const RADIATOR_THICKNESS = 52;
const RADIATOR_WIDTH = 120;

export type CoolerKind = "tower" | "stock" | "aio";

export interface DriveLayout {
  id: number;
  kind: "nvme" | "ssd" | "hdd";
  box: Box;
}

export interface SceneLayout {
  case: { w: number; h: number; d: number; color: CaseSpecs["color"]; present: boolean };
  board: { box: Box; present: boolean; ramSlots: number; m2Slots: number };
  /** Empty sockets and slots drawn on the board. */
  ramSlotBoxes: Box[];
  pcieY: number;
  cpu: { box: Box; present: boolean };
  ram: { boxes: Box[]; present: boolean };
  gpu: { box: Box; present: boolean; fans: number };
  cooler: { kind: CoolerKind; base: Box; radiator?: Box; present: boolean };
  drives: DriveLayout[];
  /** Placeholder shown while no drive is chosen. */
  driveGhost: Box;
  psu: { box: Box; present: boolean };
}

/** More power means a thicker cooler on the card. */
const gpuThickness = (tdp: number) => (tdp <= 150 ? 40 : tdp <= 260 ? 50 : tdp <= 360 ? 60 : 70);
const gpuFans = (lengthMm: number) => (lengthMm <= 240 ? 2 : 3);
const psuLength = (watts: number) => (watts <= 750 ? 140 : watts <= 1000 ? 160 : 180);

/** Slots a memory kit occupies: two modules go in alternating slots when the board has four. */
function ramSlotIndexes(modules: number, slots: number): number[] {
  if (modules === 1) return [slots >= 2 ? 1 : 0];
  if (modules === 2 && slots >= 4) return [1, 3];
  return Array.from({ length: modules }, (_, i) => i);
}

export function computeLayout(build: Build): SceneLayout {
  const caseSpecs = build.case?.specs ?? DEFAULT_CASE;
  const largest: FormFactor = (["ATX", "mATX", "ITX"] as const).find((f) => caseSpecs.formFactors.includes(f)) ?? "ATX";
  const h = CASE_HEIGHT[largest];
  const d = caseSpecs.maxGpuMm + 30;
  const w = Math.max(caseSpecs.maxCoolerMm + 50, 175);

  const formFactor = build.motherboard?.specs.formFactor ?? largest;
  const geo = BOARD_GEOMETRY[formFactor];
  const rear = -d / 2 + 15;
  const top = h / 2 - 25;
  const zBoard = -w / 2 + 20;
  const zFront = zBoard + 2;
  const cpuTop = zFront + 6;

  const socketX = rear + geo.socketX;
  const socketY = top - geo.socketY;
  const pcieY = top - geo.pcieY;
  const ramSlots = build.motherboard?.specs.ramSlots ?? (formFactor === "ITX" ? 2 : 4);
  const m2Slots = build.motherboard?.specs.m2Slots ?? 2;

  const ramSlotBox = (index: number) => {
    const x = rear + geo.ramX + index * RAM_PITCH;
    return boxFromRange(x - 3.5, x + 3.5, top - 143, top - 10, zFront, zFront + 31);
  };
  const modules = build.ram?.specs.modules ?? 2;

  const gpuLength = build.gpu?.specs.lengthMm ?? 280;
  const thickness = gpuThickness(build.gpu?.specs.tdp ?? 200);

  const coolerSpecs = build.cooler?.specs;
  const kind: CoolerKind =
    coolerSpecs?.type === "aio" ? "aio" : coolerSpecs && coolerSpecs.heightMm < 90 ? "stock" : "tower";
  const towerHeight = coolerSpecs?.heightMm || 150;
  let coolerBase: Box;
  let radiator: Box | undefined;
  if (kind === "aio") {
    const half = PUMP_SIZE / 2;
    coolerBase = boxFromRange(socketX - half, socketX + half, socketY - half, socketY + half, cpuTop, cpuTop + PUMP_HEIGHT);
    const length = coolerSpecs?.radiatorMm ?? 240;
    const zCenter = w / 2 - 70;
    radiator = boxFromRange(
      d / 2 - 12 - length, d / 2 - 12,
      h / 2 - 8 - RADIATOR_THICKNESS, h / 2 - 8,
      zCenter - RADIATOR_WIDTH / 2, zCenter + RADIATOR_WIDTH / 2,
    );
  } else if (kind === "stock") {
    const half = STOCK_DIAMETER / 2;
    coolerBase = boxFromRange(socketX - half, socketX + half, socketY - half, socketY + half, cpuTop, cpuTop + towerHeight);
  } else {
    coolerBase = boxFromRange(
      socketX - TOWER_SIZE[0] / 2, socketX + TOWER_SIZE[0] / 2,
      socketY - TOWER_SIZE[1] / 2, socketY + TOWER_SIZE[1] / 2,
      cpuTop, cpuTop + towerHeight,
    );
  }

  const floor = -h / 2;
  const shroudTop = floor + SHROUD_HEIGHT;
  const nvmeBox = (index: number) => {
    const y = pcieY + 35 - index * 45;
    return boxFromRange(rear + 60, rear + 140, y - 11, y + 11, zFront, zFront + 3);
  };
  let nvme = 0;
  let ssd = 0;
  let hdd = 0;
  const drives: DriveLayout[] = build.storage.map((drive) => {
    if (drive.specs.interface === "nvme") return { id: drive.id, kind: "nvme", box: nvmeBox(nvme++) };
    if (drive.specs.kind === "hdd") {
      const y = floor + 5 + hdd++ * 30;
      return { id: drive.id, kind: "hdd", box: boxFromRange(d / 2 - 111, d / 2 - 10, y, y + 26, -73, 74) };
    }
    const y = shroudTop + 2 + ssd++ * 10;
    return { id: drive.id, kind: "ssd", box: boxFromRange(d / 2 - 110, d / 2 - 10, y, y + 7, zBoard + 30, zBoard + 100) };
  });

  const psuLen = psuLength(build.psu?.specs.watts ?? 750);

  return {
    case: { w, h, d, color: caseSpecs.color, present: !!build.case },
    board: {
      box: boxFromRange(rear, rear + geo.w, top - geo.h, top, zBoard, zFront),
      present: !!build.motherboard,
      ramSlots,
      m2Slots,
    },
    ramSlotBoxes: Array.from({ length: ramSlots }, (_, i) => ramSlotBox(i)),
    pcieY,
    cpu: {
      box: boxFromRange(socketX - 20, socketX + 20, socketY - 20, socketY + 20, zFront, cpuTop),
      present: !!build.cpu,
    },
    ram: { boxes: ramSlotIndexes(modules, ramSlots).map(ramSlotBox), present: !!build.ram },
    gpu: {
      box: boxFromRange(rear, rear + gpuLength, pcieY - thickness, pcieY, zFront + 8, zFront + 8 + GPU_HEIGHT),
      present: !!build.gpu,
      fans: gpuFans(gpuLength),
    },
    cooler: { kind, base: coolerBase, radiator, present: !!build.cooler },
    drives,
    driveGhost: nvmeBox(0),
    psu: {
      box: boxFromRange(-d / 2 + 10, -d / 2 + 10 + psuLen, floor + 5, floor + 91, -75, 75),
      present: !!build.psu,
    },
  };
}
