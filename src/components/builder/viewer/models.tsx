"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Box, boxFromRange, CoolerKind, DriveLayout, SceneLayout, SHROUD_HEIGHT, Vec3 } from "@/lib/scene-layout";

/* Generic models built from simple shapes. They follow the real part sizes, not any product's look. */

const DARK = "#20262c";
const DARKER = "#14181c";
const METAL = "#9aa3ab";
const ACCENT = "#c6f135";

function Block({ box, color, metalness = 0.2, roughness = 0.7 }: { box: Box; color: string; metalness?: number; roughness?: number }) {
  return (
    <mesh position={box.center}>
      <boxGeometry args={box.size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

const range = (box: Box) => ({
  minX: box.center[0] - box.size[0] / 2,
  maxX: box.center[0] + box.size[0] / 2,
  minY: box.center[1] - box.size[1] / 2,
  maxY: box.center[1] + box.size[1] / 2,
  minZ: box.center[2] - box.size[2] / 2,
  maxZ: box.center[2] + box.size[2] / 2,
});

const FAN_ROTATION: Record<"x" | "y" | "z", Vec3> = {
  x: [0, Math.PI / 2, 0],
  y: [Math.PI / 2, 0, 0],
  z: [0, 0, 0],
};

function Fan({ center, axis, diameter }: { center: Vec3; axis: "x" | "y" | "z"; diameter: number }) {
  const radius = diameter / 2;
  return (
    <group position={center} rotation={FAN_ROTATION[axis]}>
      <mesh>
        <torusGeometry args={[radius - 3, 3, 8, 32]} />
        <meshStandardMaterial color={DARKER} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.3, radius * 0.3, 6, 20]} />
        <meshStandardMaterial color={DARK} roughness={0.4} metalness={0.4} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i / 7) * Math.PI * 2]}>
          <mesh position={[radius * 0.62, 0, 0]} rotation={[0.45, 0, 0]}>
            <boxGeometry args={[radius * 0.68, radius * 0.38, 1.5]} />
            <meshStandardMaterial color="#363e46" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function CaseModel({ layout, showGlass }: { layout: SceneLayout["case"]; showGlass: boolean }) {
  const { w, h, d, color } = layout;
  const panel = color === "white" ? "#e4e8ea" : "#2a3037";
  const inner = color === "white" ? "#c9ced2" : "#14181c";
  const t = 4;
  const [halfD, halfH, halfW] = [d / 2, h / 2, w / 2];

  return (
    <group>
      <Block color={panel} box={boxFromRange(-halfD, halfD, halfH - t, halfH, -halfW, halfW)} />
      <Block color={panel} box={boxFromRange(-halfD, halfD, -halfH, -halfH + t, -halfW, halfW)} />
      {/* Front panel with air vents. */}
      <Block color={panel} box={boxFromRange(halfD - t, halfD, -halfH, halfH, -halfW, halfW)} />
      {Array.from({ length: Math.floor((h - 60) / 24) }, (_, i) => (
        <Block
          key={i}
          color={inner}
          box={boxFromRange(halfD - t - 0.5, halfD + 0.5, -halfH + 30 + i * 24, -halfH + 40 + i * 24, -halfW + 25, halfW - 25)}
        />
      ))}
      {/* Rear panel with I/O opening and expansion slot covers. */}
      <Block color={panel} box={boxFromRange(-halfD, -halfD + t, -halfH, halfH, -halfW, halfW)} />
      <Block color={inner} box={boxFromRange(-halfD - 0.5, -halfD + t + 0.5, halfH - 80, halfH - 35, -halfW + 25, -halfW + 75)} />
      {/* Basement that hides the power supply and drives; see-through so they stay visible here. */}
      <mesh position={[0, -halfH + SHROUD_HEIGHT / 2 + t / 2, 0]}>
        <boxGeometry args={[d - t * 2, SHROUD_HEIGHT - t, w - t * 2]} />
        <meshStandardMaterial color={panel} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Top vents, front I/O with power button, rear expansion slot covers and fan grille. */}
      {Array.from({ length: Math.floor((d - 90) / 20) }, (_, i) => (
        <Block key={i} color={inner} box={boxFromRange(-halfD + 40 + i * 20, -halfD + 50 + i * 20, halfH - 0.5, halfH + 0.5, -halfW + 25, halfW - 25)} />
      ))}
      <mesh position={[halfD - 34, halfH + 1, halfW - 22]}>
        <cylinderGeometry args={[7, 7, 3, 20]} />
        <meshStandardMaterial color={ACCENT} />
      </mesh>
      {[0, 1].map((i) => (
        <Block key={i} color={DARKER} box={boxFromRange(halfD - 66 - i * 22, halfD - 50 - i * 22, halfH - 0.5, halfH + 1, halfW - 26, halfW - 19)} />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Block key={i} color={METAL} metalness={0.6} roughness={0.4} box={boxFromRange(-halfD - 1, -halfD, halfH - 195 - i * 20, halfH - 180 - i * 20, -halfW + 30, -halfW + 150)} />
      ))}
      <mesh position={[-halfD - 0.5, halfH - 90, 25]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[46, 3, 8, 32]} />
        <meshStandardMaterial color={DARKER} />
      </mesh>
      {showGlass && (
        <mesh position={[0, 0, halfW - 1]}>
          <boxGeometry args={[d, h, 2]} />
          <meshStandardMaterial color="#a9c7d6" transparent opacity={0.1} roughness={0.05} metalness={0.3} depthWrite={false} />
        </mesh>
      )}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (halfD - 30), -halfH - 6, sz * (halfW - 20)]}>
            <cylinderGeometry args={[12, 14, 12, 16]} />
            <meshStandardMaterial color={DARKER} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** The tray wall stays selectable as the case, and is what remains visible behind the parts. */
export function CaseBackWall({ layout }: { layout: SceneLayout["case"] }) {
  const { w, h, d, color } = layout;
  return (
    <Block
      color={color === "white" ? "#d9dde0" : "#30373f"}
      box={boxFromRange(-d / 2, d / 2, -h / 2, h / 2, -w / 2, -w / 2 + 4)}
    />
  );
}

/** Plain circuit board, shown while the downloaded one loads or if its file fails. */
export function BoardBase({ box }: { box: Box }) {
  return <Block box={box} color="#1d2730" roughness={0.8} />;
}

export function BoardModel({ layout }: { layout: SceneLayout }) {
  const { board, ramSlotBoxes, cpu, pcieY } = layout;
  const b = range(board.box);
  const c = cpu.box.center;
  const onBoard = b.maxZ;
  const pcieSlots = board.box.size[1] > 250 ? [pcieY, pcieY - 80] : [pcieY];
  return (
    <group>
      <Block color={METAL} metalness={0.6} roughness={0.4} box={boxFromRange(c[0] - 28, c[0] + 28, c[1] - 28, c[1] + 28, onBoard, onBoard + 3)} />
      <Block color={DARKER} box={boxFromRange(c[0] - 22, c[0] + 22, c[1] - 22, c[1] + 22, onBoard, onBoard + 4)} />
      {/* Power stage heatsinks. */}
      <Block color="#39424b" metalness={0.5} roughness={0.5} box={boxFromRange(b.minX + 6, c[0] - 40, b.maxY - 95, b.maxY - 8, onBoard, onBoard + 22)} />
      <Block color="#39424b" metalness={0.5} roughness={0.5} box={boxFromRange(c[0] - 38, c[0] + 38, b.maxY - 26, b.maxY - 6, onBoard, onBoard + 20)} />
      {ramSlotBoxes.map((slot, i) => {
        const r = range(slot);
        return <Block key={i} color="#0d1013" box={boxFromRange(r.minX, r.maxX, r.minY, r.maxY, r.minZ, r.minZ + 8)} />;
      })}
      {pcieSlots.map((y) => (
        <Block key={y} color="#0d1013" box={boxFromRange(b.minX + 40, b.minX + 130, y - 4, y + 4, onBoard, onBoard + 10)} />
      ))}
      {/* Chipset heatsink. */}
      <Block color="#39424b" metalness={0.5} roughness={0.5} box={boxFromRange(b.maxX - 50, b.maxX - 10, b.minY + 15, b.minY + 55, onBoard, onBoard + 10)} />
    </group>
  );
}

export function CpuModel({ box }: { box: Box }) {
  const r = range(box);
  return (
    <group>
      <Block color="#21503a" box={boxFromRange(r.minX, r.maxX, r.minY, r.maxY, r.minZ, r.minZ + 2)} />
      <Block color="#c3c9ce" metalness={0.8} roughness={0.3} box={boxFromRange(r.minX + 4, r.maxX - 4, r.minY + 4, r.maxY - 4, r.minZ + 2, r.maxZ)} />
    </group>
  );
}

export function RamModel({ boxes }: { boxes: Box[] }) {
  return (
    <group>
      {boxes.map((box, i) => {
        const r = range(box);
        return (
          <group key={i}>
            <Block box={box} color="#2c333a" metalness={0.5} roughness={0.45} />
            <Block color={ACCENT} box={boxFromRange(r.minX + 1, r.maxX - 1, r.minY + 4, r.maxY - 4, r.maxZ, r.maxZ + 1.5)} />
          </group>
        );
      })}
    </group>
  );
}

export function GpuModel({ box, fans }: { box: Box; fans: number }) {
  const r = range(box);
  const fanDiameter = Math.min(box.size[2] - 15, (box.size[0] - 30) / fans);
  const zMid = box.center[2];
  return (
    <group>
      <Block box={box} color={DARK} metalness={0.35} roughness={0.5} />
      {/* Metal bracket at the rear of the case. */}
      <Block color={METAL} metalness={0.7} roughness={0.4} box={boxFromRange(r.minX - 2, r.minX + 1, r.minY - 2, r.maxY + 2, r.minZ - 5, r.maxZ + 3)} />
      {/* Backplate on top, and an accent strip on the side that faces the glass. */}
      <Block color="#343c44" metalness={0.5} roughness={0.4} box={boxFromRange(r.minX + 2, r.maxX - 2, r.maxY, r.maxY + 2, r.minZ + 2, r.maxZ - 2)} />
      <Block color={ACCENT} box={boxFromRange(r.minX + 20, r.maxX - 20, r.maxY - 8, r.maxY - 5, r.maxZ, r.maxZ + 1)} />
      {Array.from({ length: Math.max(1, Math.floor((box.size[1] - 16) / 8)) }, (_, i) => (
        <Block
          key={i}
          color={DARKER}
          box={boxFromRange(r.minX + 8, r.maxX - 8, r.minY + 5 + i * 8, r.minY + 8 + i * 8, r.maxZ, r.maxZ + 0.5)}
        />
      ))}
      {/* Fans point down, as in a real card. */}
      {Array.from({ length: fans }, (_, i) => (
        <Fan
          key={i}
          axis="y"
          diameter={fanDiameter}
          center={[r.minX + 15 + ((i + 0.5) * (box.size[0] - 30)) / fans, r.minY - 2, zMid]}
        />
      ))}
    </group>
  );
}

function Tube({ points }: { points: Vec3[] }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 24, 5, 8),
    [points],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#0e1114" roughness={0.6} />
    </mesh>
  );
}

function TowerCooler({ box }: { box: Box }) {
  const r = range(box);
  const fins = Math.min(26, Math.floor((box.size[2] - 26) / 5));
  const finMinX = r.minX + 28;
  return (
    <group>
      <Block color="#b4744a" metalness={0.8} roughness={0.35} box={boxFromRange(box.center[0] - 22, box.center[0] + 22, box.center[1] - 22, box.center[1] + 22, r.minZ, r.minZ + 8)} />
      {[-18, -6, 6, 18].map((dy) => (
        <mesh key={dy} position={[box.center[0] + 5, box.center[1] + dy, (r.minZ + r.maxZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[3, 3, box.size[2] - 4, 10]} />
          <meshStandardMaterial color="#b4744a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: fins }, (_, i) => {
        const z = r.minZ + 24 + (i * (box.size[2] - 30)) / Math.max(1, fins - 1);
        return <Block key={i} color="#aab2b9" metalness={0.75} roughness={0.35} box={boxFromRange(finMinX, r.maxX, r.minY, r.maxY, z, z + 1.2)} />;
      })}
      <Block color={DARKER} box={boxFromRange(finMinX, r.maxX, r.minY, r.maxY, r.maxZ - 3, r.maxZ)} />
      {/* The fan pushes air toward the rear of the case. */}
      <Fan axis="x" diameter={Math.min(120, box.size[2] - 26)} center={[r.minX + 14, box.center[1], r.minZ + 18 + (box.size[2] - 18) / 2]} />
    </group>
  );
}

function StockCooler({ box }: { box: Box }) {
  const r = range(box);
  const radius = box.size[0] / 2;
  return (
    <group>
      <mesh position={[box.center[0], box.center[1], r.minZ + box.size[2] * 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.9, radius * 0.9, box.size[2] * 0.6, 28]} />
        <meshStandardMaterial color="#8f979e" metalness={0.75} roughness={0.4} />
      </mesh>
      <Fan axis="z" diameter={box.size[0]} center={[box.center[0], box.center[1], r.maxZ - 8]} />
    </group>
  );
}

function LiquidCooler({ pump, radiator }: { pump: Box; radiator: Box }) {
  const p = range(pump);
  const rad = range(radiator);
  const fanCount = Math.max(1, Math.round(radiator.size[0] / 120));
  const tubes = useMemo<Vec3[][]>(
    () =>
      [-14, 14].map((offset) => [
        [pump.center[0] + offset, pump.center[1] + 25, p.maxZ - 8],
        [pump.center[0] + offset + 25, pump.center[1] + 45, p.maxZ + 18],
        [rad.maxX - 18 - 25 + offset, rad.minY - 20, radiator.center[2] - 25],
        [rad.maxX - 18 + offset, rad.minY + 18, radiator.center[2]],
      ]),
    [pump, radiator, p.maxZ, rad.maxX, rad.minY],
  );
  return (
    <group>
      <mesh position={pump.center} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[pump.size[0] / 2, pump.size[0] / 2, pump.size[2], 32]} />
        <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[pump.center[0], pump.center[1], p.maxZ + 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[pump.size[0] * 0.32, pump.size[0] * 0.32, 1, 32]} />
        <meshStandardMaterial color={ACCENT} />
      </mesh>
      <Block color="#262c32" metalness={0.5} roughness={0.5} box={boxFromRange(rad.minX, rad.maxX, rad.maxY - 27, rad.maxY, rad.minZ, rad.maxZ)} />
      {Array.from({ length: fanCount }, (_, i) => (
        <Fan
          key={i}
          axis="y"
          diameter={Math.min(116, radiator.size[0] / fanCount - 4)}
          center={[rad.minX + ((i + 0.5) * radiator.size[0]) / fanCount, rad.minY + 12, radiator.center[2]]}
        />
      ))}
      {tubes.map((points, i) => <Tube key={i} points={points} />)}
    </group>
  );
}

export function CoolerModel({ kind, base, radiator }: { kind: CoolerKind; base: Box; radiator?: Box }) {
  if (kind === "aio" && radiator) return <LiquidCooler pump={base} radiator={radiator} />;
  return kind === "stock" ? <StockCooler box={base} /> : <TowerCooler box={base} />;
}

export function DriveModel({ drive }: { drive: DriveLayout }) {
  const r = range(drive.box);
  if (drive.kind === "nvme") {
    return (
      <group>
        <Block box={drive.box} color="#17392b" />
        {[0, 1, 2].map((i) => (
          <Block key={i} color={DARKER} box={boxFromRange(r.minX + 6 + i * 24, r.minX + 26 + i * 24, r.minY + 4, r.maxY - 4, r.maxZ, r.maxZ + 1.5)} />
        ))}
      </group>
    );
  }
  return (
    <Block box={drive.box} color={drive.kind === "hdd" ? "#8d959c" : "#3a4149"} metalness={0.6} roughness={0.45} />
  );
}

export function PsuModel({ box }: { box: Box }) {
  const r = range(box);
  return (
    <group>
      <Block box={box} color={DARK} metalness={0.3} roughness={0.6} />
      <Block color={ACCENT} box={boxFromRange(r.minX + 15, r.minX + 75, r.minY + 30, r.minY + 36, r.maxZ, r.maxZ + 1)} />
      <Fan axis="y" diameter={110} center={[box.center[0], r.minY - 1, box.center[2]]} />
    </group>
  );
}
