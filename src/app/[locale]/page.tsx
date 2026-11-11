import { getTranslations } from "next-intl/server";
import { CategoryGrid } from "@/components/CategoryGrid";
import { Link } from "@/i18n/navigation";
import { getCategories, getGames, getParts } from "@/lib/catalog";
import { estimateFps, PRESETS } from "@/lib/fps";
import type { Part } from "@/lib/specs";

export const dynamic = "force-dynamic";

const EXAMPLE_GAMES = ["cyberpunk-2077", "alan-wake-2", "black-myth-wukong"];

export default async function HomePage() {
  const t = await getTranslations("home");
  const tFps = await getTranslations("fps");
  const [categories, games, cpus, gpus] = await Promise.all([getCategories(), getGames(), getParts("cpu"), getParts("gpu")]);

  const cpu = cpus.find((p) => p.name === "Ryzen 5 7600X") as Part<"cpu"> | undefined;
  const gpu = gpus.find((p) => p.name.includes("RTX 4070")) as Part<"gpu"> | undefined;
  const exampleGames = EXAMPLE_GAMES.map((slug) => games.find((g) => g.slug === slug)).filter((g) => g !== undefined);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-sm text-signal">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{t("lead")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/builder" className="btn btn-primary">{t("ctaBuilder")}</Link>
            <Link href="/catalog" className="btn btn-ghost">{t("ctaCatalog")}</Link>
          </div>
        </div>

        {cpu && gpu && (
          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="font-semibold">{t("exampleTitle")}</h2>
            <p className="mt-1 text-sm text-muted">
              {t("exampleBuild", { cpu: cpu.name, gpu: gpu.specs.chip })}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">{tFps("game")}</th>
                    {PRESETS.map((p) => <th key={p} className="px-2 py-2 text-right font-medium">{tFps(p)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {exampleGames.map((game) => (
                    <tr key={game.id} className="border-t border-line">
                      <td className="py-2 pr-3">{game.name}</td>
                      {PRESETS.map((preset) => (
                        <td key={preset} className="whitespace-nowrap px-2 py-2 text-right font-mono">
                          ≈ {estimateFps(
                            { cpuIndex: cpu.specs.cpuIndex, gpuIndex: gpu.specs.gpuIndex, vramGb: gpu.specs.vramGb, ramGb: 32, ramModules: 2 },
                            game, preset, "1080p",
                          ).fps}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t("categories")}</h2>
        <CategoryGrid categories={categories} />
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t("stepsTitle")}</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="rounded-xl border border-line bg-panel p-5">
              <span className="font-mono text-sm text-signal">0{n}</span>
              <h3 className="mt-2 font-semibold">{t(`step${n}Title`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`step${n}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
