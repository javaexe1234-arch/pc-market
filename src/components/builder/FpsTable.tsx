"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Build } from "@/lib/compatibility";
import { estimateFps, GameProfile, hardwareFromBuild, PRESETS, RESOLUTIONS, Resolution } from "@/lib/fps";

const RESOLUTION_KEYS = Object.keys(RESOLUTIONS) as Resolution[];

const fpsColor = (fps: number) => (fps < 30 ? "text-danger" : fps < 60 ? "text-warn" : "text-good");

export function FpsTable({ build, games }: { build: Build; games: GameProfile[] }) {
  const t = useTranslations("fps");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const hardware = hardwareFromBuild(build);

  return (
    <section aria-labelledby="fps-title" className="rounded-xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fps-title" className="text-xl font-bold">{t("title")}</h2>
        <div role="group" aria-label={t("resolution")} className="flex overflow-hidden rounded-lg border border-line text-sm font-semibold">
          {RESOLUTION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === resolution}
              onClick={() => setResolution(key)}
              className={`cursor-pointer px-3 py-1.5 font-mono ${key === resolution ? "bg-raised text-signal" : "text-muted hover:text-text"}`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {!hardware ? (
        <p className="mt-4 rounded-lg bg-raised p-4 text-sm text-muted">{t("needParts")}</p>
      ) : (
        <>
          {!build.gpu && <p className="mt-3 text-sm text-warn">{t("integrated")}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">{t("game")}</th>
                  {PRESETS.map((preset) => (
                    <th key={preset} scope="col" className="px-2 py-2 text-right font-medium">{t(preset)}</th>
                  ))}
                  <th scope="col" className="py-2 pl-4 font-medium">
                    {t("limiter")} <span className="font-normal">({t("limiterHint")})</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-t border-line" data-game={game.slug}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{game.name}</th>
                    {PRESETS.map((preset) => {
                      const e = estimateFps(hardware, game, preset, resolution);
                      return (
                        <td key={preset} className="whitespace-nowrap px-2 py-2 text-right font-mono">
                          <span className={`font-semibold ${fpsColor(e.fps)}`}>≈ {e.fps}</span>
                          <span className="block text-xs text-muted">{e.min}–{e.max}</span>
                        </td>
                      );
                    })}
                    <td className="py-2 pl-4 text-muted">
                      {t(`limiter_${estimateFps(hardware, game, "high", resolution).limiter}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
            <span className="text-danger">● {t("legendLow")}</span>
            <span className="text-warn">● {t("legendMid")}</span>
            <span className="text-good">● {t("legendHigh")}</span>
          </div>
          <p className="mt-3 text-xs text-muted">{t("disclaimer")}</p>
        </>
      )}
    </section>
  );
}
