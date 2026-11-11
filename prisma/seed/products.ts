import type {
  CaseSpecs, CoolerSpecs, CpuSpecs, MotherboardSpecs, RamSpecs, Slot, SpecsBySlot, StorageSpecs,
} from "../../src/lib/specs";

/** Prices are demo values in thousands of sum: replace them before launch. Dimensions are approximate. */
export interface Row<S extends Slot = Slot> {
  brand: string;
  name: string;
  price: number;
  specs: SpecsBySlot[S];
}

const cpu = (brand: string, name: string, price: number, socket: string, cores: number, threads: number, boostGhz: number, tdp: number, powerW: number, memoryTypes: CpuSpecs["memoryTypes"], cpuIndex: number, igpuIndex: number): Row<"cpu"> =>
  ({ brand, name, price, specs: { socket, cores, threads, boostGhz, tdp, powerW, memoryTypes, cpuIndex, igpuIndex } });
const board = (brand: string, name: string, price: number, socket: string, chipset: string, formFactor: MotherboardSpecs["formFactor"], memoryType: MotherboardSpecs["memoryType"], ramSlots: number, maxRamGb: number, maxRamMhz: number, m2Slots: number, sataPorts: number): Row<"motherboard"> =>
  ({ brand, name, price, specs: { socket, chipset, formFactor, memoryType, ramSlots, maxRamGb, maxRamMhz, m2Slots, sataPorts } });
const ram = (brand: string, name: string, price: number, memoryType: RamSpecs["memoryType"], mhz: number, modules: number, moduleGb: number): Row<"ram"> =>
  ({ brand, name, price, specs: { memoryType, mhz, modules, moduleGb, totalGb: modules * moduleGb } });
const gpu = (brand: string, name: string, price: number, chip: string, vramGb: number, lengthMm: number, tdp: number, gpuIndex: number, minPsuW: number): Row<"gpu"> =>
  ({ brand, name, price, specs: { chip, vramGb, lengthMm, tdp, gpuIndex, minPsuW } });
const drive = (brand: string, name: string, price: number, iface: StorageSpecs["interface"], kind: StorageSpecs["kind"], capacityGb: number, readMbps: number): Row<"storage"> =>
  ({ brand, name, price, specs: { interface: iface, kind, capacityGb, readMbps } });
const psu = (brand: string, name: string, price: number, watts: number, rating: string, modular: boolean): Row<"psu"> =>
  ({ brand, name, price, specs: { watts, rating, modular } });
const cooler = (brand: string, name: string, price: number, type: CoolerSpecs["type"], sockets: string[], heightMm: number, radiatorMm: number, tdpRating: number): Row<"cooler"> =>
  ({ brand, name, price, specs: { type, sockets, heightMm, radiatorMm, tdpRating } });
const pcCase = (brand: string, name: string, price: number, formFactors: CaseSpecs["formFactors"], maxGpuMm: number, maxCoolerMm: number, maxRadiatorMm: number, color: CaseSpecs["color"]): Row<"case"> =>
  ({ brand, name, price, specs: { formFactors, maxGpuMm, maxCoolerMm, maxRadiatorMm, color } });

const ALL_SOCKETS = ["AM4", "AM5", "LGA1700", "LGA1851"];

export const PRODUCTS: { [S in Slot]: Row<S>[] } = {
  cpu: [
    cpu("AMD", "Ryzen 5 5600", 1450, "AM4", 6, 12, 4.4, 65, 88, ["DDR4"], 82, 0),
    cpu("AMD", "Ryzen 7 5700X3D", 2900, "AM4", 8, 16, 4.1, 105, 142, ["DDR4"], 100, 0),
    cpu("AMD", "Ryzen 5 8600G", 2550, "AM5", 6, 12, 5.0, 65, 88, ["DDR5"], 88, 16),
    cpu("AMD", "Ryzen 5 7600X", 2700, "AM5", 6, 12, 5.3, 105, 142, ["DDR5"], 100, 5),
    cpu("AMD", "Ryzen 5 9600X", 3150, "AM5", 6, 12, 5.4, 65, 88, ["DDR5"], 108, 5),
    cpu("AMD", "Ryzen 7 7800X3D", 4900, "AM5", 8, 16, 5.0, 120, 162, ["DDR5"], 128, 5),
    cpu("AMD", "Ryzen 7 9800X3D", 6200, "AM5", 8, 16, 5.2, 120, 162, ["DDR5"], 140, 5),
    cpu("AMD", "Ryzen 9 9950X", 7900, "AM5", 16, 32, 5.7, 170, 230, ["DDR5"], 118, 5),
    cpu("Intel", "Core i3-12100F", 1050, "LGA1700", 4, 8, 4.3, 58, 89, ["DDR4", "DDR5"], 68, 0),
    cpu("Intel", "Core i5-12400F", 1550, "LGA1700", 6, 12, 4.4, 65, 117, ["DDR4", "DDR5"], 78, 0),
    cpu("Intel", "Core i5-14600K", 3700, "LGA1700", 14, 20, 5.3, 125, 181, ["DDR4", "DDR5"], 105, 6),
    cpu("Intel", "Core i7-14700K", 5200, "LGA1700", 20, 28, 5.6, 125, 253, ["DDR4", "DDR5"], 112, 6),
    cpu("Intel", "Core Ultra 7 265K", 4900, "LGA1851", 20, 20, 5.5, 125, 250, ["DDR5"], 105, 8),
  ],
  motherboard: [
    board("Gigabyte", "B550M DS3H", 1150, "AM4", "B550", "mATX", "DDR4", 4, 128, 4733, 2, 4),
    board("MSI", "B550-A PRO", 1650, "AM4", "B550", "ATX", "DDR4", 4, 128, 5100, 2, 6),
    board("ASRock", "B650M-HDV/M.2", 1500, "AM5", "B650", "mATX", "DDR5", 2, 96, 6400, 2, 4),
    board("ASUS", "TUF Gaming B650-Plus", 2600, "AM5", "B650", "ATX", "DDR5", 4, 192, 6400, 2, 4),
    board("ASRock", "B650I Lightning WiFi", 2800, "AM5", "B650", "ITX", "DDR5", 2, 96, 6400, 2, 2),
    board("MSI", "MAG X870E Tomahawk WiFi", 4800, "AM5", "X870E", "ATX", "DDR5", 4, 256, 8000, 4, 4),
    board("Gigabyte", "B760M DS3H DDR4", 1400, "LGA1700", "B760", "mATX", "DDR4", 4, 128, 5333, 2, 4),
    board("MSI", "PRO B760-P DDR4 II", 1700, "LGA1700", "B760", "ATX", "DDR4", 4, 128, 5333, 2, 4),
    board("MSI", "PRO Z790-A MAX WiFi", 3400, "LGA1700", "Z790", "ATX", "DDR5", 4, 192, 7800, 4, 6),
    board("ASUS", "ROG Strix B760-I Gaming WiFi", 3300, "LGA1700", "B760", "ITX", "DDR5", 2, 96, 7600, 2, 4),
    board("MSI", "PRO Z890-P WiFi", 3500, "LGA1851", "Z890", "ATX", "DDR5", 4, 256, 9200, 4, 4),
  ],
  ram: [
    ram("Kingston", "Fury Beast DDR4-3200 8 GB", 300, "DDR4", 3200, 1, 8),
    ram("Corsair", "Vengeance LPX DDR4-3200 2×8 GB", 550, "DDR4", 3200, 2, 8),
    ram("G.Skill", "Ripjaws V DDR4-3600 2×16 GB", 950, "DDR4", 3600, 2, 16),
    ram("Crucial", "DDR5-5600 16 GB", 600, "DDR5", 5600, 1, 16),
    ram("Kingston", "Fury Beast DDR5-5600 2×8 GB", 750, "DDR5", 5600, 2, 8),
    ram("G.Skill", "Flare X5 DDR5-6000 2×16 GB", 1450, "DDR5", 6000, 2, 16),
    ram("Corsair", "Vengeance DDR5-6000 4×16 GB", 2900, "DDR5", 6000, 4, 16),
    ram("G.Skill", "Trident Z5 RGB DDR5-6400 2×32 GB", 3300, "DDR5", 6400, 2, 32),
  ],
  gpu: [
    gpu("MSI", "GeForce RTX 3060 Ventus 2X 12G", 3900, "RTX 3060", 12, 235, 170, 50, 550),
    gpu("ASUS", "Dual GeForce RTX 4060 OC 8G", 4300, "RTX 4060", 8, 227, 115, 62, 550),
    gpu("Sapphire", "Pulse Radeon RX 7600 8G", 3700, "RX 7600", 8, 240, 165, 58, 550),
    gpu("ASRock", "Intel Arc B580 Challenger 12G", 4100, "Arc B580", 12, 272, 190, 62, 600),
    gpu("MSI", "GeForce RTX 5060 Ventus 2X 8G", 4800, "RTX 5060", 8, 197, 145, 78, 550),
    gpu("Gigabyte", "GeForce RTX 4070 Eagle OC 12G", 8200, "RTX 4070", 12, 261, 200, 100, 650),
    gpu("ASUS", "Prime GeForce RTX 5070 12G", 8900, "RTX 5070", 12, 268, 250, 113, 650),
    gpu("Sapphire", "Nitro+ Radeon RX 7800 XT 16G", 8700, "RX 7800 XT", 16, 320, 263, 112, 700),
    gpu("PowerColor", "Red Devil Radeon RX 9070 XT 16G", 11500, "RX 9070 XT", 16, 365, 304, 145, 750),
    gpu("MSI", "GeForce RTX 5070 Ti Ventus 3X 16G", 12500, "RTX 5070 Ti", 16, 303, 300, 143, 750),
    gpu("Gigabyte", "Aorus GeForce RTX 5080 Master 16G", 19500, "RTX 5080", 16, 360, 360, 170, 850),
    gpu("ASUS", "ROG Strix GeForce RTX 5090 OC 32G", 42000, "RTX 5090", 32, 358, 575, 235, 1000),
  ],
  storage: [
    drive("Kingston", "NV3 1 TB", 850, "nvme", "ssd", 1000, 6000),
    drive("WD", "Black SN770 1 TB", 1050, "nvme", "ssd", 1000, 5150),
    drive("Crucial", "P3 Plus 2 TB", 1550, "nvme", "ssd", 2000, 5000),
    drive("Samsung", "990 Pro 2 TB", 2350, "nvme", "ssd", 2000, 7450),
    drive("Crucial", "BX500 1 TB", 800, "sata", "ssd", 1000, 540),
    drive("Samsung", "870 EVO 1 TB", 1150, "sata", "ssd", 1000, 560),
    drive("Seagate", "BarraCuda 2 TB", 800, "sata", "hdd", 2000, 190),
    drive("WD", "Blue 4 TB", 1250, "sata", "hdd", 4000, 180),
  ],
  psu: [
    psu("DeepCool", "PK550D", 650, 550, "80+ Bronze", false),
    psu("Corsair", "CX650", 850, 650, "80+ Bronze", false),
    psu("be quiet!", "Pure Power 12 M 750W", 1450, 750, "80+ Gold", true),
    psu("MSI", "MAG A850GL", 1600, 850, "80+ Gold", true),
    psu("Corsair", "RM1000x", 2500, 1000, "80+ Gold", true),
    psu("Seasonic", "Prime TX-1300", 5300, 1300, "80+ Titanium", true),
  ],
  cooler: [
    cooler("AMD", "Wraith Stealth", 150, "air", ["AM4", "AM5"], 54, 0, 65),
    cooler("Intel", "Laminar RM1", 150, "air", ["LGA1700"], 47, 0, 65),
    cooler("DeepCool", "AK400", 400, "air", ALL_SOCKETS, 155, 0, 220),
    cooler("Thermalright", "Peerless Assassin 120 SE", 500, "air", ALL_SOCKETS, 155, 0, 245),
    cooler("Noctua", "NH-D15 G2", 1900, "air", ALL_SOCKETS, 168, 0, 250),
    cooler("Arctic", "Liquid Freezer III 240", 1050, "aio", ALL_SOCKETS, 0, 240, 280),
    cooler("Arctic", "Liquid Freezer III 360", 1400, "aio", ALL_SOCKETS, 0, 360, 350),
  ],
  case: [
    pcCase("Zalman", "T3 Plus", 450, ["mATX", "ITX"], 285, 155, 0, "black"),
    pcCase("DeepCool", "CC560", 750, ["ATX", "mATX", "ITX"], 370, 163, 360, "black"),
    pcCase("NZXT", "H5 Flow", 1250, ["ATX", "mATX", "ITX"], 365, 165, 280, "white"),
    pcCase("Corsair", "4000D Airflow", 1300, ["ATX", "mATX", "ITX"], 360, 170, 360, "black"),
    pcCase("Lian Li", "O11 Dynamic EVO", 2300, ["ATX", "mATX", "ITX"], 422, 167, 360, "white"),
    pcCase("Cooler Master", "MasterBox NR200P", 1300, ["ITX"], 330, 155, 280, "black"),
    pcCase("Fractal Design", "Terra", 2300, ["ITX"], 322, 77, 0, "white"),
  ],
};

export const CATEGORIES: { slug: Slot; nameRu: string; nameUz: string }[] = [
  { slug: "cpu", nameRu: "Процессоры", nameUz: "Protsessorlar" },
  { slug: "motherboard", nameRu: "Материнские платы", nameUz: "Ona platalar" },
  { slug: "ram", nameRu: "Оперативная память", nameUz: "Operativ xotira" },
  { slug: "gpu", nameRu: "Видеокарты", nameUz: "Videokartalar" },
  { slug: "storage", nameRu: "Накопители", nameUz: "Xotira qurilmalari" },
  { slug: "psu", nameRu: "Блоки питания", nameUz: "Quvvat bloklari" },
  { slug: "cooler", nameRu: "Охлаждение", nameUz: "Sovutish tizimlari" },
  { slug: "case", nameRu: "Корпуса", nameUz: "Korpuslar" },
];

/** Builds the Russian and Uzbek descriptions from the specs. */
export function describePart(slot: Slot, row: Row): { ru: string; uz: string } {
  const title = `${row.brand} ${row.name}`;
  const v = (key: string) => (row.specs as unknown as Record<string, string | number>)[key];
  const iface = v("interface") === "nvme" ? "M.2 NVMe" : "SATA";
  switch (slot) {
    case "cpu":
      return {
        ru: `Процессор ${title}: ядер — ${v("cores")}, потоков — ${v("threads")}, частота до ${v("boostGhz")} ГГц, сокет ${v("socket")}.`,
        uz: `${title} protsessori: ${v("cores")} yadro, ${v("threads")} oqim, chastotasi ${v("boostGhz")} GHz gacha, ${v("socket")} soketi.`,
      };
    case "motherboard":
      return {
        ru: `Материнская плата ${title}: сокет ${v("socket")}, чипсет ${v("chipset")}, форм-фактор ${v("formFactor")}, память ${v("memoryType")}.`,
        uz: `${title} ona platasi: ${v("socket")} soketi, ${v("chipset")} chipseti, ${v("formFactor")} form-faktori, ${v("memoryType")} xotira.`,
      };
    case "ram":
      return {
        ru: `Комплект памяти ${title}: ${v("totalGb")} ГБ, ${v("memoryType")}, ${v("mhz")} МГц, модулей: ${v("modules")}.`,
        uz: `${title} xotira to'plami: ${v("totalGb")} GB, ${v("memoryType")}, ${v("mhz")} MHz, modullar soni: ${v("modules")}.`,
      };
    case "gpu":
      return {
        ru: `Видеокарта ${title}: ${v("vramGb")} ГБ видеопамяти, длина ${v("lengthMm")} мм, рекомендуемый блок питания от ${v("minPsuW")} Вт.`,
        uz: `${title} videokartasi: ${v("vramGb")} GB video xotira, uzunligi ${v("lengthMm")} mm, tavsiya etilgan quvvat bloki ${v("minPsuW")} W dan.`,
      };
    case "storage":
      return {
        ru: `Накопитель ${title}: ${v("capacityGb")} ГБ, интерфейс ${iface}, чтение до ${v("readMbps")} МБ/с.`,
        uz: `${title} xotira qurilmasi: ${v("capacityGb")} GB, ${iface} interfeysi, o'qish tezligi ${v("readMbps")} MB/s gacha.`,
      };
    case "psu":
      return {
        ru: `Блок питания ${title}: ${v("watts")} Вт, сертификат ${v("rating")}.`,
        uz: `${title} quvvat bloki: ${v("watts")} W, ${v("rating")} sertifikati.`,
      };
    case "cooler":
      return v("type") === "aio"
        ? {
            ru: `Жидкостное охлаждение ${title}: радиатор ${v("radiatorMm")} мм, рассчитано на ${v("tdpRating")} Вт.`,
            uz: `${title} suyuq sovutish tizimi: ${v("radiatorMm")} mm radiator, ${v("tdpRating")} W ga mo'ljallangan.`,
          }
        : {
            ru: `Воздушный кулер ${title}: высота ${v("heightMm")} мм, рассчитан на ${v("tdpRating")} Вт.`,
            uz: `${title} havo sovutgichi: balandligi ${v("heightMm")} mm, ${v("tdpRating")} W ga mo'ljallangan.`,
          };
    case "case":
      return {
        ru: `Корпус ${title}: видеокарта до ${v("maxGpuMm")} мм, кулер до ${v("maxCoolerMm")} мм.`,
        uz: `${title} korpusi: videokarta ${v("maxGpuMm")} mm gacha, sovutgich ${v("maxCoolerMm")} mm gacha.`,
      };
  }
}
