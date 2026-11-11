import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../prisma/seed/products";
import { Build, checkBuild } from "../src/lib/compatibility";
import { Box, computeLayout, SceneLayout, SHROUD_HEIGHT } from "../src/lib/scene-layout";
import type { Part, Slot, SpecsBySlot } from "../src/lib/specs";
import { part } from "./helpers";

const seeded = <S extends Slot>(slot: S): Part<S>[] =>
  (PRODUCTS[slot] as { name: string; specs: SpecsBySlot[S] }[]).map((row) => ({ ...part(slot, row.specs), name: row.name }));

function expectInsideCase(box: Box, layout: SceneLayout, label: string) {
  const half = [layout.case.d / 2, layout.case.h / 2, layout.case.w / 2];
  box.center.forEach((center, axis) => {
    expect(center - box.size[axis] / 2, label).toBeGreaterThanOrEqual(-half[axis]);
    expect(center + box.size[axis] / 2, label).toBeLessThanOrEqual(half[axis]);
  });
}

const hasFitError = (build: Build) =>
  checkBuild(build).some((i) => ["caseFormFactor", "gpuLength", "coolerHeight", "radiator"].includes(i.code));

describe("computeLayout", () => {
  const boards = seeded("motherboard");
  const cases = seeded("case");

  it("keeps every part that passes compatibility inside the case, for all seeded parts", () => {
    let checked = 0;
    for (const pcCase of cases) {
      for (const board of boards) {
        const base: Build = { storage: [], case: pcCase, motherboard: board };
        if (hasFitError(base)) continue;
        const layout = computeLayout(base);
        expectInsideCase(layout.board.box, layout, `${board.name} in ${pcCase.name}`);
        layout.ramSlotBoxes.forEach((b) => expectInsideCase(b, layout, `RAM slots of ${board.name} in ${pcCase.name}`));

        for (const gpu of seeded("gpu")) {
          const build = { ...base, gpu };
          if (hasFitError(build)) continue;
          const l = computeLayout(build);
          expectInsideCase(l.gpu.box, l, `${gpu.name} in ${pcCase.name}`);
          const bottom = l.gpu.box.center[1] - l.gpu.box.size[1] / 2;
          expect(bottom, `${gpu.name} above shroud in ${pcCase.name}`).toBeGreaterThanOrEqual(-l.case.h / 2 + SHROUD_HEIGHT);
          checked++;
        }
        for (const cooler of seeded("cooler")) {
          const build = { ...base, cooler };
          if (hasFitError(build)) continue;
          const l = computeLayout(build);
          expectInsideCase(l.cooler.base, l, `${cooler.name} in ${pcCase.name}`);
          if (l.cooler.radiator) expectInsideCase(l.cooler.radiator, l, `radiator of ${cooler.name} in ${pcCase.name}`);
          checked++;
        }
        for (const psu of seeded("psu")) {
          const l = computeLayout({ ...base, psu });
          expectInsideCase(l.psu.box, l, `${psu.name} in ${pcCase.name}`);
          checked++;
        }
        const drives = computeLayout({ ...base, storage: seeded("storage") });
        drives.drives.forEach((drive) => {
          if (drive.kind !== "nvme") expectInsideCase(drive.box, drives, `drive in ${pcCase.name}`);
        });
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("scales parts with their specs", () => {
    const short = computeLayout({ storage: [], gpu: part("gpu", { lengthMm: 200 }) });
    const long = computeLayout({ storage: [], gpu: part("gpu", { lengthMm: 350 }) });
    expect(short.gpu.box.size[0]).toBe(200);
    expect(long.gpu.box.size[0]).toBe(350);
    expect(short.gpu.fans).toBe(2);
    expect(long.gpu.fans).toBe(3);

    const atx = computeLayout({ storage: [], motherboard: part("motherboard", { formFactor: "ATX" }) });
    const itx = computeLayout({ storage: [], motherboard: part("motherboard", { formFactor: "ITX" }) });
    expect(atx.board.box.size[1]).toBeGreaterThan(itx.board.box.size[1]);

    const tall = computeLayout({ storage: [], cooler: part("cooler", { heightMm: 165 }) });
    expect(tall.cooler.base.size[2]).toBe(165);
    expect(computeLayout({ storage: [], cooler: part("cooler", { heightMm: 54 }) }).cooler.kind).toBe("stock");
  });

  it("derives the case from its limits and colour", () => {
    const small = computeLayout({ storage: [], case: part("case", { formFactors: ["ITX"], maxGpuMm: 300, color: "white" }) });
    expect(small.case).toMatchObject({ d: 330, h: 340, color: "white", present: true });
  });

  it("places memory by module count", () => {
    const board = part("motherboard", { ramSlots: 4 });
    const count = (modules: number) => computeLayout({ storage: [], motherboard: board, ram: part("ram", { modules }) }).ram.boxes;
    expect(count(1)).toHaveLength(1);
    expect(count(2)).toHaveLength(2);
    expect(count(4)).toHaveLength(4);
    const [a, b] = count(2);
    expect(b.center[0] - a.center[0]).toBe(18);
  });

  it("gives each drive its own place by type", () => {
    const { drives } = computeLayout({
      storage: [
        part("storage", { interface: "nvme", kind: "ssd" }),
        part("storage", { interface: "nvme", kind: "ssd" }),
        part("storage", { interface: "sata", kind: "ssd" }),
        part("storage", { interface: "sata", kind: "hdd" }),
      ],
    });
    expect(drives.map((d) => d.kind)).toEqual(["nvme", "nvme", "ssd", "hdd"]);
    expect(new Set(drives.map((d) => d.box.center.join())).size).toBe(4);
  });

  it("draws an incomplete build with placeholders", () => {
    const layout = computeLayout({ storage: [] });
    expect(layout.case.present).toBe(false);
    expect(layout.gpu.present).toBe(false);
    expect(layout.board.box.size[1]).toBe(305);
  });

  it("does not move parts when the build has no case or board yet", () => {
    const gpu = part("gpu");
    expect(computeLayout({ storage: [], gpu }).gpu.box).toEqual(computeLayout({ storage: [], gpu, cpu: part("cpu") }).gpu.box);
  });
});
