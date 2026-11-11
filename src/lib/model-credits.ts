/** Downloaded 3D models and their licences. CC-BY models must keep this credit visible on the site. */
export interface ModelCredit {
  file: string;
  title: string;
  author: string;
  license: "CC0 1.0" | "CC-BY 3.0";
  licenseUrl: string;
  source: string;
}

const CC0 = { license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" } as const;
const BY = { license: "CC-BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" } as const;

export const MODEL_CREDITS: ModelCredit[] = [
  { file: "cpu.glb", title: "CPU", author: "iPoly3D", source: "https://poly.pizza/m/oF0cAyddAI", ...CC0 },
  { file: "motherboard.glb", title: "PCB", author: "iPoly3D", source: "https://poly.pizza/m/ZvCYeJncTF", ...CC0 },
  { file: "ram.glb", title: "RAM", author: "iPoly3D", source: "https://poly.pizza/m/obBMPOGYvy", ...CC0 },
  { file: "gpu.glb", title: "Graphics card", author: "pgonarg", source: "https://poly.pizza/m/i45v5trpyR", ...BY },
  { file: "storage.glb", title: "SSD", author: "iPoly3D", source: "https://poly.pizza/m/sax4h1Dx9z", ...CC0 },
  { file: "case-black.glb", title: "Computer", author: "CreativeTrio", source: "https://poly.pizza/m/7KNoiQlSxi", ...CC0 },
  { file: "case-white.glb", title: "System unit", author: "Poly by Google", source: "https://poly.pizza/m/1rAUeGQ3J_y", ...BY },
];
