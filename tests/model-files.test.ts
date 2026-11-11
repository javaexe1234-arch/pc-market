import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODEL_CREDITS } from "../src/lib/model-credits";

const DIR = join(__dirname, "..", "public", "models");
const MAX_BYTES = 1_000_000;

describe("downloaded 3D models", () => {
  it("credits every file in the models folder", () => {
    const credited = MODEL_CREDITS.map((c) => c.file).sort();
    expect(readdirSync(DIR).filter((f) => f.endsWith(".glb")).sort()).toEqual(credited);
  });

  it.each(MODEL_CREDITS.map((c) => c.file))("%s is a self-contained, small GLB", (file) => {
    const path = join(DIR, file);
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeLessThan(MAX_BYTES);
    const bytes = readFileSync(path);
    expect(bytes.subarray(0, 4).toString()).toBe("glTF");
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    expect(json.extensionsRequired ?? []).toEqual([]);
    const external = [...(json.buffers ?? []), ...(json.images ?? [])].filter((item: { uri?: string }) => item.uri);
    expect(external).toEqual([]);
  });
});
