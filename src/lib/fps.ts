import type { Build } from "./compatibility";

export const PRESETS = ["low", "medium", "high", "ultra"] as const;
export type Preset = (typeof PRESETS)[number];

export const RESOLUTIONS = { "1080p": 1, "1440p": 0.72, "4K": 0.42 } as const;
export type Resolution = keyof typeof RESOLUTIONS;

export interface GameProfile {
  id: number;
  slug: string;
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
}

export interface Hardware {
  cpuIndex: number;
  gpuIndex: number;
  vramGb: number;
  ramGb: number;
  ramModules: number;
}

export interface FpsEstimate {
  fps: number;
  min: number;
  max: number;
  limiter: "cpu" | "gpu" | "balanced";
}

const SHARPNESS = 4;
const SPREAD = 0.15;
const VRAM_PENALTY = 0.7;
const RAM_PENALTY = 0.8;
const SINGLE_CHANNEL_PENALTY = 0.9;
/** Graphics memory assumed available to integrated graphics. */
const IGPU_VRAM_GB = 4;

const presetFps = (game: GameProfile, preset: Preset) =>
  ({ low: game.fpsLow, medium: game.fpsMedium, high: game.fpsHigh, ultra: game.fpsUltra })[preset];

const presetVram = (game: GameProfile, preset: Preset) =>
  ({ low: game.vramLow, medium: game.vramMedium, high: game.vramHigh, ultra: game.vramUltra })[preset];

/**
 * Estimates FPS from relative CPU and GPU indices. This is a model, not a measurement:
 * the slower component dominates, and the smooth minimum avoids an unrealistic hard cut-off.
 */
export function estimateFps(hw: Hardware, game: GameProfile, preset: Preset, resolution: Resolution): FpsEstimate {
  let gpuFps = (presetFps(game, preset) * hw.gpuIndex * RESOLUTIONS[resolution]) / 100;
  if (hw.vramGb < presetVram(game, preset)) gpuFps *= VRAM_PENALTY;

  let cpuFps = (game.cpuFps * hw.cpuIndex) / 100;
  if (hw.ramModules === 1) cpuFps *= SINGLE_CHANNEL_PENALTY;

  let fps = (gpuFps ** -SHARPNESS + cpuFps ** -SHARPNESS) ** (-1 / SHARPNESS);
  if (hw.ramGb < game.ramGb) fps *= RAM_PENALTY;

  const ratio = gpuFps / cpuFps;
  return {
    fps: Math.round(fps),
    min: Math.round(fps * (1 - SPREAD)),
    max: Math.round(fps * (1 + SPREAD)),
    limiter: ratio < 0.9 ? "gpu" : ratio > 1.1 ? "cpu" : "balanced",
  };
}

/** Hardware a build provides for the estimate, or null until it has a CPU, graphics and memory. */
export function hardwareFromBuild(build: Build): Hardware | null {
  const { cpu, gpu, ram } = build;
  if (!cpu || !ram) return null;
  if (!gpu && cpu.specs.igpuIndex === 0) return null;
  return {
    cpuIndex: cpu.specs.cpuIndex,
    gpuIndex: gpu ? gpu.specs.gpuIndex : cpu.specs.igpuIndex,
    vramGb: gpu ? gpu.specs.vramGb : IGPU_VRAM_GB,
    ramGb: ram.specs.totalGb,
    ramModules: ram.specs.modules,
  };
}
