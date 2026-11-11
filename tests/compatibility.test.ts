import { describe, expect, it } from "vitest";
import { Build, candidateIssues, checkBuild, estimateLoadW } from "../src/lib/compatibility";
import { part } from "./helpers";

const good = (): Build => ({
  cpu: part("cpu"),
  motherboard: part("motherboard"),
  ram: part("ram"),
  gpu: part("gpu"),
  storage: [part("storage")],
  psu: part("psu"),
  cooler: part("cooler"),
  case: part("case"),
});

const codes = (b: Build) => checkBuild(b).map((i) => i.code);

describe("checkBuild", () => {
  it("accepts a valid build", () => {
    expect(checkBuild(good())).toEqual([]);
  });

  it("reports every missing required part", () => {
    const missing = checkBuild({ storage: [] }).filter((i) => i.code === "missing");
    expect(missing.map((i) => i.params?.slot).sort()).toEqual(
      ["case", "cooler", "cpu", "motherboard", "psu", "ram", "storage"],
    );
  });

  const errorCases: [string, (b: Build) => Build, string][] = [
    ["CPU socket", (b) => ({ ...b, cpu: part("cpu", { socket: "LGA1700" }) }), "cpuSocket"],
    ["cooler socket", (b) => ({ ...b, cooler: part("cooler", { sockets: ["LGA1700"] }) }), "coolerSocket"],
    ["memory type", (b) => ({ ...b, ram: part("ram", { memoryType: "DDR4" }) }), "ramType"],
    ["CPU memory type", (b) => ({ ...b, cpu: part("cpu", { memoryTypes: ["DDR4"] }) }), "ramCpuType"],
    ["module count", (b) => ({ ...b, ram: part("ram", { modules: 8 }) }), "ramSlots"],
    ["memory capacity", (b) => ({ ...b, ram: part("ram", { totalGb: 256 }) }), "ramCapacity"],
    ["form factor", (b) => ({ ...b, case: part("case", { formFactors: ["ITX"] }) }), "caseFormFactor"],
    ["GPU length", (b) => ({ ...b, gpu: part("gpu", { lengthMm: 400 }) }), "gpuLength"],
    ["cooler height", (b) => ({ ...b, cooler: part("cooler", { heightMm: 170 }) }), "coolerHeight"],
    [
      "radiator size",
      (b) => ({
        ...b,
        case: part("case", { maxRadiatorMm: 240 }),
        cooler: part("cooler", { type: "aio", heightMm: 0, radiatorMm: 360 }),
      }),
      "radiator",
    ],
    ["M.2 slots", (b) => ({ ...b, storage: [part("storage"), part("storage"), part("storage")] }), "m2Slots"],
    [
      "SATA ports",
      (b) => ({
        ...b,
        motherboard: part("motherboard", { sataPorts: 0 }),
        storage: [part("storage", { interface: "sata" })],
      }),
      "sataPorts",
    ],
    ["weak PSU", (b) => ({ ...b, psu: part("psu", { watts: 300 }) }), "psuTooWeak"],
    ["no graphics", (b) => ({ ...b, gpu: undefined, cpu: part("cpu", { igpuIndex: 0 }) }), "noGraphics"],
  ];
  it.each(errorCases)("flags %s as an error", (_name, change, code) => {
    expect(checkBuild(change(good())).find((i) => i.code === code)?.level).toBe("error");
  });

  const warningCases: [string, (b: Build) => Build, string][] = [
    ["thin PSU headroom", (b) => ({ ...b, psu: part("psu", { watts: 420 }) }), "psuHeadroom"],
    ["underrated cooler", (b) => ({ ...b, cooler: part("cooler", { tdpRating: 65 }) }), "coolerTdp"],
    ["fast memory", (b) => ({ ...b, ram: part("ram", { mhz: 8000 }) }), "ramSpeed"],
    ["single module", (b) => ({ ...b, ram: part("ram", { modules: 1, moduleGb: 16, totalGb: 16 }) }), "singleChannel"],
    ["weak CPU for GPU", (b) => ({ ...b, cpu: part("cpu", { cpuIndex: 60 }), gpu: part("gpu", { gpuIndex: 230 }) }), "cpuBottleneck"],
    ["weak GPU for CPU", (b) => ({ ...b, gpu: part("gpu", { gpuIndex: 30 }) }), "gpuBottleneck"],
  ];
  it.each(warningCases)("flags %s as a warning", (_name, change, code) => {
    expect(checkBuild(change(good())).find((i) => i.code === code)?.level).toBe("warning");
  });

  it("does not require a GPU when the CPU has integrated graphics", () => {
    expect(codes({ ...good(), gpu: undefined })).not.toContain("noGraphics");
  });

  it("does not apply the air-cooler height limit to liquid coolers", () => {
    const aio = part("cooler", { type: "aio", heightMm: 500, radiatorMm: 240 });
    expect(codes({ ...good(), cooler: aio })).not.toContain("coolerHeight");
  });
});

describe("estimateLoadW", () => {
  it("adds the base allowance, CPU, GPU and drives", () => {
    expect(estimateLoadW(good())).toBe(50 + 140 + 200 + 5);
  });
  it("is zero with no CPU or GPU", () => {
    expect(estimateLoadW({ storage: [] })).toBe(0);
  });
});

describe("candidateIssues", () => {
  it("explains why a part does not fit", () => {
    const build = { ...good(), cpu: undefined };
    expect(candidateIssues(build, part("cpu", { socket: "LGA1700" })).map((i) => i.code)).toContain("cpuSocket");
  });
  it("is empty for a fitting part and ignores unrelated build problems", () => {
    const build: Build = { storage: [], motherboard: part("motherboard") };
    expect(candidateIssues(build, part("cpu"))).toEqual([]);
  });
  it("counts an additional drive against free slots", () => {
    const build = { ...good(), storage: [part("storage"), part("storage")] };
    expect(candidateIssues(build, part("storage")).map((i) => i.code)).toContain("m2Slots");
  });
});
