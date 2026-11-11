"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Build } from "@/lib/compatibility";
import { MODEL_CREDITS } from "@/lib/model-credits";
import { Slot, SLOTS } from "@/lib/specs";
import { Schematic2D } from "./viewer/Schematic2D";
import type { CaseView } from "./viewer/Viewer";

function Loading() {
  const t = useTranslations("viewer");
  return <div className="flex h-full items-center justify-center text-sm text-muted">{t("loading")}</div>;
}

// three.js is large and needs a browser, so it loads only when the 3D view is opened.
const Viewer = dynamic(() => import("./viewer/Viewer"), { ssr: false, loading: Loading });

type Mode = "3d" | "2d";

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded-lg border border-line bg-ink/80 text-xs font-semibold">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`min-h-8 cursor-pointer px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40 ${
            option.value === value ? "bg-raised text-signal" : "text-muted hover:text-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  build: Build;
  errorSlots: Slot[];
  onSelectSlot: (slot: Slot) => void;
}

export function BuildPreview({ build, errorSlots, onSelectSlot }: Props) {
  const t = useTranslations("viewer");
  const tSlots = useTranslations("slots");
  const [mode, setMode] = useState<Mode>("3d");
  const [caseView, setCaseView] = useState<CaseView>("glass");
  const [hovered, setHovered] = useState<Slot | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [supports3d, setSupports3d] = useState(true);

  useEffect(() => {
    if (!webglAvailable()) {
      setSupports3d(false);
      setMode("2d");
    }
  }, []);

  // The pointer never "leaves" a part that disappears, so clear the label when the view changes.
  useEffect(() => setHovered(null), [mode, caseView]);

  const select = (slot: Slot) => {
    setHovered(null);
    onSelectSlot(slot);
  };

  const partName = (slot: Slot) =>
    slot === "storage" ? build.storage.map((x) => x.name).join(", ") : build[slot]?.name;

  const unavailable = (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted" data-testid="viewer-unavailable">
      {t("unavailable")}
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label={t("modeLabel")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "3d", label: "3D", disabled: !supports3d },
            { value: "2d", label: "2D" },
          ]}
        />
        {mode === "3d" && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={t("caseViewLabel")}
              value={build.case ? caseView : "open"}
              onChange={setCaseView}
              options={[
                { value: "closed", label: t("caseClosed"), disabled: !build.case },
                { value: "glass", label: t("caseGlass"), disabled: !build.case },
                { value: "open", label: t("caseOpen") },
              ]}
            />
            <button type="button" className="btn btn-ghost !min-h-8 !px-2.5 !py-1 !text-xs" onClick={() => setResetSignal((n) => n + 1)}>
              {t("resetView")}
            </button>
          </div>
        )}
      </div>

      <div
        className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-[radial-gradient(ellipse_at_50%_35%,var(--viewer-center),var(--viewer-edge)_75%)]"
        style={mode === "3d" ? { cursor: hovered ? "pointer" : "grab" } : undefined}
        data-testid="viewer"
      >
        {mode === "3d" ? (
          <Viewer
            label={t("label")}
            fallback={unavailable}
            build={build}
            errorSlots={errorSlots}
            caseView={caseView}
            resetSignal={resetSignal}
            hovered={hovered}
            onHover={setHovered}
            onSelect={select}
          />
        ) : (
          <Schematic2D build={build} errorSlots={errorSlots} hovered={hovered} onHover={setHovered} onSelect={select} />
        )}
        {hovered && (
          <p className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] rounded-md border border-line bg-panel px-2.5 py-1 text-xs" data-testid="viewer-hover">
            <span className="font-semibold">{tSlots(hovered)}</span>
            {partName(hovered) ? `: ${partName(hovered)}` : ` · ${t("notChosen")}`}
          </p>
        )}
      </div>

      {mode === "2d" && (
        <ol className="mt-2 grid gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-2" data-testid="schematic-legend">
          {SLOTS.map((slot, i) => (
            <li key={slot} className="truncate">
              <span className="font-mono font-semibold text-text">{i + 1}</span> {tSlots(slot)}
              {partName(slot) ? `: ${partName(slot)}` : ` · ${t("notChosen")}`}
            </li>
          ))}
        </ol>
      )}

      <p className="mt-2 text-xs text-muted">{mode === "3d" ? t("hint3d") : t("hint2d")}</p>

      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer hover:text-text">{t("credits")}</summary>
        <p className="mt-1">{t("creditsNote")}</p>
        <ul className="mt-1 space-y-0.5">
          {MODEL_CREDITS.map((credit) => (
            <li key={credit.file}>
              <a href={credit.source} target="_blank" rel="noreferrer" className="underline hover:text-text">{credit.title}</a>
              {", "}{credit.author}{", "}
              <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="underline hover:text-text">{credit.license}</a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
