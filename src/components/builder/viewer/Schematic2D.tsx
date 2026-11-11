"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Build } from "@/lib/compatibility";
import { Box, computeLayout, SHROUD_HEIGHT } from "@/lib/scene-layout";
import { Slot, SLOTS } from "@/lib/specs";

interface Props {
  build: Build;
  errorSlots: Slot[];
  hovered: Slot | null;
  onHover: (slot: Slot | null) => void;
  onSelect: (slot: Slot) => void;
}

const MARGIN = 34;

/** Side view through the glass panel, to scale, drawn from the same layout as the 3D model. */
export function Schematic2D({ build, errorSlots, hovered, onHover, onSelect }: Props) {
  const t = useTranslations("viewer");
  const tSlots = useTranslations("slots");
  const layout = useMemo(() => computeLayout(build), [build]);
  const { w, h, d } = layout.case;

  const rect = (box: Box) => ({
    x: box.center[0] - box.size[0] / 2,
    y: -box.center[1] - box.size[1] / 2,
    width: box.size[0],
    height: box.size[1],
  });

  const gpuOptional = !build.gpu && !!build.cpu && build.cpu.specs.igpuIndex > 0;
  const coolerBoxes = layout.cooler.radiator ? [layout.cooler.base, layout.cooler.radiator] : [layout.cooler.base];
  const parts: { slot: Slot; boxes: Box[]; present: boolean }[] = [
    { slot: "motherboard", boxes: [layout.board.box], present: layout.board.present },
    { slot: "ram", boxes: layout.ram.boxes, present: layout.ram.present },
    { slot: "cpu", boxes: [layout.cpu.box], present: layout.cpu.present },
    { slot: "storage", boxes: layout.drives.length ? layout.drives.map((x) => x.box) : [layout.driveGhost], present: layout.drives.length > 0 },
    { slot: "cooler", boxes: coolerBoxes, present: layout.cooler.present },
    ...(gpuOptional ? [] : [{ slot: "gpu" as const, boxes: [layout.gpu.box], present: layout.gpu.present }]),
    { slot: "psu", boxes: [layout.psu.box], present: layout.psu.present },
  ];

  /** Centre of the part, except parts that other parts cover: those use a free corner. */
  const markerPosition = (slot: Slot, box: Box): [number, number] => {
    const { x, y, width, height } = rect(box);
    if (slot === "motherboard") return [x + width - 20, y + height - 20];
    if (slot === "cpu") return [x - 2, y - 2];
    if (slot === "storage") return [x + 12, y + height / 2];
    return [x + width / 2, y + height / 2];
  };

  const stroke = (slot: Slot) =>
    errorSlots.includes(slot) ? "var(--color-danger)" : hovered === slot ? "var(--color-signal)" : "var(--color-muted)";
  const number = (slot: Slot) => SLOTS.indexOf(slot) + 1;

  const interactive = (slot: Slot, name: string) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": name,
    style: { cursor: "pointer" },
    onClick: () => onSelect(slot),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(slot);
      }
    },
    onPointerEnter: () => onHover(slot),
    onPointerLeave: () => onHover(null),
  });

  const partName = (slot: Slot) =>
    slot === "storage" ? build.storage.map((x) => x.name).join(", ") : build[slot]?.name;

  return (
    <div data-testid="schematic" className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <svg
          viewBox={`${-d / 2 - MARGIN} ${-h / 2 - MARGIN} ${d + MARGIN * 2} ${h + MARGIN * 2}`}
          className="h-full w-full"
          role="group"
          aria-label={t("schematicLabel")}
        >
          <g {...interactive("case", `${tSlots("case")}: ${partName("case") ?? t("notChosen")}`)}>
            <rect
              x={-d / 2} y={-h / 2} width={d} height={h} rx={6}
              fill="var(--color-panel)"
              stroke={stroke("case")}
              strokeWidth={errorSlots.includes("case") || hovered === "case" ? 4 : 2.5}
              strokeDasharray={layout.case.present ? undefined : "10 7"}
            />
          </g>
          <line x1={-d / 2} x2={d / 2} y1={h / 2 - SHROUD_HEIGHT} y2={h / 2 - SHROUD_HEIGHT} stroke="var(--color-line)" strokeWidth={2} pointerEvents="none" />

          {parts.map(({ slot, boxes, present }) => {
            const label = `${tSlots(slot)}: ${partName(slot) ?? t("notChosen")}`;
            return (
              <g key={slot} {...interactive(slot, label)} data-slot-2d={slot}>
                {boxes.map((box, i) => (
                  <rect
                    key={i}
                    {...rect(box)}
                    rx={2}
                    fill={present ? "var(--color-raised)" : "transparent"}
                    fillOpacity={slot === "motherboard" ? 0.55 : 0.92}
                    stroke={stroke(slot)}
                    strokeWidth={hovered === slot || errorSlots.includes(slot) ? 3 : 1.5}
                    strokeDasharray={present ? undefined : "8 6"}
                  />
                ))}
              </g>
            );
          })}

          {/* Numbers sit above every part, so a cooler over the CPU never hides one. */}
          {parts.map(({ slot, boxes, present }) => {
            const [x, y] = markerPosition(slot, boxes[0]);
            const failed = errorSlots.includes(slot);
            return (
              <g key={slot} pointerEvents="none">
                <circle cx={x} cy={y} r={13} fill={failed ? "var(--color-danger)" : present ? "var(--color-signal)" : "var(--color-muted)"} />
                <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={failed || !present ? "var(--color-panel)" : "var(--color-signal-ink)"}>
                  {number(slot)}
                </text>
              </g>
            );
          })}

          <g fontSize={15} fill="var(--color-muted)" fontFamily="var(--font-mono)" pointerEvents="none">
            <text x={0} y={-h / 2 - 12} textAnchor="middle">{`${d} × ${h} × ${w} ${t("mm")}`}</text>
            <text x={-d / 2} y={h / 2 + 24}>{t("rear")}</text>
            <text x={d / 2} y={h / 2 + 24} textAnchor="end">{t("front")}</text>
            <text x={0} y={h / 2 + 24} textAnchor="middle">{`${tSlots("case")} ${number("case")}`}</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
