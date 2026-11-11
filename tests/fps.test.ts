import { describe, expect, it } from "vitest";
import { estimateFps, GameProfile, Hardware, hardwareFromBuild, PRESETS, RESOLUTIONS, Resolution } from "../src/lib/fps";
import { GAMES } from "../prisma/seed/games";
import { part } from "./helpers";

const game: GameProfile = {
  id: 1, slug: "g", name: "G", year: 2024,
  fpsLow: 160, fpsMedium: 120, fpsHigh: 90, fpsUltra: 60, cpuFps: 150,
  ramGb: 16, vramLow: 6, vramMedium: 8, vramHigh: 10, vramUltra: 12,
};
const hw: Hardware = { cpuIndex: 100, gpuIndex: 100, vramGb: 16, ramGb: 32, ramModules: 2 };

describe("estimateFps", () => {
  it("never rises with a heavier preset, for every seeded game and resolution", () => {
    for (const seeded of GAMES) {
      for (const resolution of Object.keys(RESOLUTIONS) as Resolution[]) {
        for (const vramGb of [4, 8, 16]) {
          const values = PRESETS.map((p) => estimateFps({ ...hw, vramGb }, { ...seeded, id: 0 }, p, resolution).fps);
          expect(values).toEqual([...values].sort((a, b) => b - a));
        }
      }
    }
  });

  it("never falls with a stronger GPU or CPU", () => {
    const base = estimateFps(hw, game, "high", "1080p").fps;
    expect(estimateFps({ ...hw, gpuIndex: 150 }, game, "high", "1080p").fps).toBeGreaterThanOrEqual(base);
    expect(estimateFps({ ...hw, cpuIndex: 130 }, game, "high", "1080p").fps).toBeGreaterThanOrEqual(base);
  });

  it("falls as resolution rises", () => {
    const at = (r: Resolution) => estimateFps(hw, game, "high", r).fps;
    expect(at("1080p")).toBeGreaterThan(at("1440p"));
    expect(at("1440p")).toBeGreaterThan(at("4K"));
  });

  it("applies VRAM, RAM and single-channel penalties", () => {
    const base = estimateFps(hw, game, "ultra", "1080p").fps;
    expect(estimateFps({ ...hw, vramGb: 8 }, game, "ultra", "1080p").fps).toBeLessThan(base);
    expect(estimateFps({ ...hw, ramGb: 8 }, game, "ultra", "1080p").fps).toBeLessThan(base);
    const cpuBound = { ...hw, gpuIndex: 400 };
    expect(estimateFps({ ...cpuBound, ramModules: 1 }, game, "low", "1080p").fps).toBeLessThan(
      estimateFps(cpuBound, game, "low", "1080p").fps,
    );
  });

  it("identifies the limiting component", () => {
    expect(estimateFps({ ...hw, gpuIndex: 30 }, game, "ultra", "1080p").limiter).toBe("gpu");
    expect(estimateFps({ ...hw, gpuIndex: 400, cpuIndex: 50 }, game, "low", "1080p").limiter).toBe("cpu");
  });

  it("reports a range around the estimate", () => {
    const e = estimateFps(hw, game, "ultra", "1080p");
    expect(e.min).toBeLessThan(e.fps);
    expect(e.max).toBeGreaterThan(e.fps);
  });
});

describe("hardwareFromBuild", () => {
  it("needs a CPU and memory", () => {
    expect(hardwareFromBuild({ storage: [], gpu: part("gpu") })).toBeNull();
  });
  it("needs graphics", () => {
    expect(hardwareFromBuild({ storage: [], cpu: part("cpu", { igpuIndex: 0 }), ram: part("ram") })).toBeNull();
  });
  it("falls back to integrated graphics", () => {
    const hardware = hardwareFromBuild({ storage: [], cpu: part("cpu", { igpuIndex: 16 }), ram: part("ram") });
    expect(hardware?.gpuIndex).toBe(16);
  });
});

describe("seeded games", () => {
  it("has 20 unique games", () => {
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(20);
  });
});
