/**
 * Starting game list. Values are approximate calibration figures, not measurements:
 * FPS at 1080p, without ray tracing or upscaling, on the reference GPU (index 100).
 * Order: name, year, low, medium, high, ultra, CPU ceiling, RAM GB, VRAM low/medium/high/ultra.
 */
type Row = [string, number, number, number, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  ["Cyberpunk 2077", 2020, 170, 135, 105, 85, 140, 16, 4, 6, 8, 10],
  ["Alan Wake 2", 2023, 95, 82, 70, 60, 130, 16, 6, 8, 10, 12],
  ["Black Myth: Wukong", 2024, 110, 90, 65, 45, 120, 16, 6, 8, 10, 12],
  ["Indiana Jones and the Great Circle", 2024, 150, 130, 110, 85, 150, 16, 8, 8, 10, 12],
  ["Star Wars Outlaws", 2024, 105, 85, 70, 50, 110, 16, 6, 8, 10, 12],
  ["Avatar: Frontiers of Pandora", 2023, 110, 90, 72, 50, 120, 16, 6, 8, 10, 12],
  ["Hogwarts Legacy", 2023, 130, 105, 85, 65, 90, 16, 6, 8, 10, 12],
  ["Starfield", 2023, 105, 90, 75, 62, 85, 16, 6, 8, 8, 10],
  ["Microsoft Flight Simulator 2024", 2024, 90, 70, 55, 42, 50, 32, 6, 8, 10, 12],
  ["Dragon's Dogma 2", 2024, 90, 80, 70, 60, 65, 16, 6, 6, 8, 10],
  ["The Last of Us Part I", 2023, 130, 105, 85, 70, 100, 16, 6, 8, 9, 11],
  ["Red Dead Redemption 2", 2019, 170, 125, 95, 70, 130, 12, 4, 6, 8, 10],
  ["Monster Hunter Wilds", 2025, 90, 75, 62, 48, 70, 16, 6, 8, 10, 12],
  ["S.T.A.L.K.E.R. 2: Heart of Chornobyl", 2024, 95, 78, 60, 45, 70, 16, 6, 8, 10, 12],
  ["Senua's Saga: Hellblade II", 2024, 100, 85, 68, 52, 120, 16, 6, 8, 10, 12],
  ["Remnant II", 2023, 100, 85, 65, 50, 110, 16, 6, 6, 8, 10],
  ["Assassin's Creed Shadows", 2025, 100, 85, 65, 50, 90, 16, 6, 8, 10, 12],
  ["Kingdom Come: Deliverance II", 2025, 140, 115, 90, 65, 100, 16, 4, 6, 8, 10],
  ["DOOM: The Dark Ages", 2025, 130, 115, 95, 80, 160, 16, 8, 8, 10, 12],
  ["Cities: Skylines II", 2023, 85, 65, 45, 32, 45, 16, 4, 6, 8, 10],
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const GAMES = ROWS.map(
  ([name, year, fpsLow, fpsMedium, fpsHigh, fpsUltra, cpuFps, ramGb, vramLow, vramMedium, vramHigh, vramUltra]) => ({
    slug: slugify(name),
    name,
    year,
    fpsLow,
    fpsMedium,
    fpsHigh,
    fpsUltra,
    cpuFps,
    ramGb,
    vramLow,
    vramMedium,
    vramHigh,
    vramUltra,
  }),
);
