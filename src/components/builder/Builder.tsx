"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { resolveBuild, selectionFromQuery, selectionToQuery } from "@/lib/build-selection";
import { hydrateBuildStore, useBuildStore } from "@/lib/build-store";
import { checkBuild } from "@/lib/compatibility";
import { formatUzs } from "@/lib/format";
import type { GameProfile } from "@/lib/fps";
import { keySpecs } from "@/lib/part-format";
import { Part, Slot, SLOTS } from "@/lib/specs";
import { Link } from "@/i18n/navigation";
import { PartIcon } from "../PartIcon";
import { useSpecTranslators } from "../useFormatters";
import { BuildPreview } from "./BuildPreview";
import { FpsTable } from "./FpsTable";
import { PartPicker } from "./PartPicker";
import { Summary } from "./Summary";

function PartLine({ part, onRemove, removeLabel }: { part: Part; onRemove: () => void; removeLabel: string }) {
  const locale = useLocale();
  const specT = useSpecTranslators();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <Link href={`/product/${part.slug}`} className="font-semibold hover:text-signal">
          {part.brand} {part.name}
        </Link>
        <p className="font-mono text-xs text-muted">{keySpecs(part, specT)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">{formatUzs(part.priceUzs, locale)}</span>
        <button type="button" onClick={onRemove} aria-label={`${removeLabel}: ${part.name}`} className="rounded p-1 text-muted hover:text-danger">
          ✕
        </button>
      </div>
    </div>
  );
}

export function Builder({ parts, games }: { parts: Part[]; games: GameProfile[] }) {
  const t = useTranslations("builder");
  const tSlots = useTranslations("slots");
  const selection = useBuildStore((s) => s.selection);
  const hydrated = useBuildStore((s) => s.hydrated);
  const setPart = useBuildStore((s) => s.setPart);
  const removePart = useBuildStore((s) => s.removePart);
  const load = useBuildStore((s) => s.load);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [ready, setReady] = useState(false);

  // A shared link wins over the saved build; after that the URL follows the build.
  useEffect(() => {
    hydrateBuildStore().then(() => {
      const fromUrl = selectionFromQuery(window.location.search);
      if (fromUrl) load(fromUrl);
      setReady(true);
    });
  }, [load]);

  useEffect(() => {
    if (!ready) return;
    const query = selectionToQuery(selection);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [ready, selection]);

  const build = useMemo(() => resolveBuild(selection, parts), [selection, parts]);
  const issues = useMemo(() => checkBuild(build), [build]);
  const errorSlots = useMemo(
    () => SLOTS.filter((slot) => issues.some((i) => i.level === "error" && i.code !== "missing" && i.slots.includes(slot))),
    [issues],
  );
  const gpuOptional = !build.gpu && !!build.cpu && build.cpu.specs.igpuIndex > 0;

  return (
    <div className="space-y-8" aria-busy={!hydrated}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem] xl:grid-cols-[1fr_34rem]">
        <div className="space-y-4 lg:sticky lg:top-20 lg:order-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <BuildPreview build={build} errorSlots={errorSlots} onSelectSlot={setPicking} />
          <Summary build={build} issues={issues} />
        </div>

        <ul className="space-y-2 lg:order-1">
          {SLOTS.map((slot) => {
            const selected = slot === "storage" ? build.storage : build[slot] ? [build[slot] as Part] : [];
            const hasError = errorSlots.includes(slot);
            return (
              <li
                key={slot}
                data-slot={slot}
                className={`rounded-xl border bg-panel p-4 ${hasError ? "border-danger" : selected.length ? "border-signal/40" : "border-line"}`}
              >
                <div className="flex items-center gap-3">
                  <PartIcon slot={slot} className={`h-8 w-8 shrink-0 ${selected.length ? "text-signal" : "text-muted"}`} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold">{tSlots(slot)}</h2>
                    {slot === "gpu" && gpuOptional && <p className="text-xs text-muted">{t("optional")}</p>}
                  </div>
                  <button
                    type="button"
                    className={`btn ${selected.length ? "btn-ghost" : "btn-primary"}`}
                    onClick={() => setPicking(slot)}
                  >
                    {slot === "storage" && selected.length ? t("addDrive") : selected.length ? t("replace") : t("choose")}
                  </button>
                </div>
                {selected.length > 0 && (
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    {selected.map((part) => (
                      <PartLine
                        key={part.id}
                        part={part}
                        removeLabel={t("remove")}
                        onRemove={() => removePart(slot, part.id)}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <FpsTable build={build} games={games} />

      {picking && (
        <PartPicker
          slot={picking}
          parts={parts.filter((p) => p.slot === picking)}
          build={build}
          onPick={(part) => {
            setPart(part.slot, part.id);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
