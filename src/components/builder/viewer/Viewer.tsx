"use client";

import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, ReactNode, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Build } from "@/lib/compatibility";
import { Box, computeLayout, Vec3 } from "@/lib/scene-layout";
import type { Slot } from "@/lib/specs";
import { BoardBase, BoardModel, CaseBackWall, CaseModel, CoolerModel, CpuModel, DriveModel, GpuModel, PsuModel, RamModel } from "./models";

const SIGNAL = "#c6f135";
const DANGER = "#ff5c52";
const GHOST = "#6f7f8a";
const CAMERA_POSITION = new THREE.Vector3(380, 280, 1000).setLength(1280);
const SLIDE_DISTANCE = 220;
/** The downloaded white tower is mid-grey in its file. */
const WHITE_CASE_BRIGHTNESS = 1.3;
/** Pointer travel, in pixels, above which a press counts as turning the view and not a click. */
const CLICK_TOLERANCE = 5;

export type CaseView = "closed" | "glass" | "open";

function Controls({ resetSignal }: { resetSignal: number }) {
  const camera = useThree((s) => s.camera);
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControls>(null);

  useEffect(() => {
    const orbit = new OrbitControls(camera, canvas);
    orbit.enablePan = false;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.1;
    orbit.minDistance = 500;
    orbit.maxDistance = 2800;
    const onChange = () => invalidate();
    orbit.addEventListener("change", onChange);
    controls.current = orbit;
    return () => {
      orbit.removeEventListener("change", onChange);
      orbit.dispose();
    };
  }, [camera, canvas, invalidate]);

  useEffect(() => {
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [resetSignal, camera, invalidate]);

  useFrame(() => controls.current?.update());
  return null;
}

/** Where a downloaded model's own x, y and z axes point in the scene. */
type AxisMap = [Vec3, Vec3, Vec3];

/** Memory modules stand on edge: model length along scene y, model height along scene z. */
const RAM_AXES: AxisMap = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];
/** Tower models face their own +z; the scene's front is +x. */
const CASE_AXES: AxisMap = [[0, 0, -1], [0, 1, 0], [1, 0, 0]];
/** The card's fans point down, as when it is installed. */
const GPU_AXES: AxisMap = [[1, 0, 0], [0, -1, 0], [0, 0, -1]];

/** Loads a downloaded model and fits it exactly into a box, so its size still follows the part specs. */
function FittedModel({ url, box, axes, brightness }: { url: string; box: Box; axes?: AxisMap; brightness?: number }) {
  const gltf = useLoader(GLTFLoader, url);
  const object = useMemo(() => {
    const inner = new THREE.Group();
    const model = gltf.scene.clone(true);
    if (brightness) {
      model.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
          node.material = node.material.clone();
          node.material.color.multiplyScalar(brightness);
        }
      });
    }
    inner.add(model);
    if (axes) {
      const [x, y, z] = axes.map((axis) => new THREE.Vector3(...axis));
      inner.setRotationFromMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    }
    inner.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(inner);
    const size = bounds.getSize(new THREE.Vector3());
    inner.position.copy(bounds.getCenter(new THREE.Vector3())).negate();
    const outer = new THREE.Group();
    outer.add(inner);
    outer.scale.set(box.size[0] / size.x, box.size[1] / size.y, box.size[2] / size.z);
    outer.position.set(...box.center);
    return outer;
  }, [gltf, box, axes, brightness]);
  return <primitive object={object} />;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** A downloaded model, with the built-in shape shown while it loads or if the file fails. */
function WithFallback({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </Boundary>
  );
}

function Outline({ box, color }: { box: Box; color: string }) {
  const shape = useMemo(() => new THREE.BoxGeometry(...box.size), [box.size]);
  return (
    <lineSegments position={box.center}>
      <edgesGeometry args={[shape]} />
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

interface PartProps {
  slot: Slot;
  boxes: Box[];
  /** Changes when the installed part changes, which replays the slide-in. Absent for a placeholder. */
  installed?: number | string;
  animate?: boolean;
  hasError: boolean;
  hovered: boolean;
  onHover: (slot: Slot | null) => void;
  onSelect: (slot: Slot) => void;
  children?: ReactNode;
}

/** One selectable part: slides into place when installed, outlined on hover or when incompatible. */
function Part({ slot, boxes, installed, animate = true, hasError, hovered, onHover, onSelect, children }: PartProps) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const sliding = useRef(false);
  const isGhost = installed === undefined;

  useLayoutEffect(() => {
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isGhost || !animate || !motionOk || !group.current) return;
    group.current.position.z = SLIDE_DISTANCE;
    sliding.current = true;
    invalidate();
  }, [installed, isGhost, animate, invalidate]);

  useFrame((_, delta) => {
    if (!sliding.current || !group.current) return;
    const z = group.current.position.z * Math.exp(-9 * delta);
    group.current.position.z = z < 0.5 ? 0 : z;
    if (z < 0.5) sliding.current = false;
    invalidate();
  });

  const outlineColor = hasError ? DANGER : hovered ? SIGNAL : isGhost ? GHOST : null;

  return (
    <group
      ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(slot);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta <= CLICK_TOLERANCE) onSelect(slot);
      }}
    >
      {isGhost
        ? boxes.map((box, i) => (
            <mesh key={i} position={box.center}>
              <boxGeometry args={box.size} />
              <meshBasicMaterial color={hovered ? SIGNAL : GHOST} transparent opacity={hovered ? 0.22 : 0.07} depthWrite={false} />
            </mesh>
          ))
        : children}
      {outlineColor && boxes.map((box, i) => <Outline key={i} box={box} color={outlineColor} />)}
    </group>
  );
}

export interface ViewerProps {
  build: Build;
  errorSlots: Slot[];
  caseView: CaseView;
  resetSignal: number;
  hovered: Slot | null;
  onHover: (slot: Slot | null) => void;
  onSelect: (slot: Slot) => void;
}

function Scene({ build, errorSlots, caseView, resetSignal, hovered, onHover, onSelect }: ViewerProps) {
  const layout = useMemo(() => computeLayout(build), [build]);
  const props = (slot: Slot) => ({
    slot,
    hasError: errorSlots.includes(slot),
    hovered: hovered === slot,
    onHover,
    onSelect,
  });
  const caseBox: Box = useMemo(
    () => ({ center: [0, 0, 0], size: [layout.case.d, layout.case.h, layout.case.w] }),
    [layout.case.d, layout.case.h, layout.case.w],
  );
  const backWall: Box = { center: [0, 0, -layout.case.w / 2 + 2], size: [layout.case.d, layout.case.h, 4] };
  const coolerBoxes = layout.cooler.radiator ? [layout.cooler.base, layout.cooler.radiator] : [layout.cooler.base];
  const gpuOptional = !build.gpu && !!build.cpu && build.cpu.specs.igpuIndex > 0;
  const boardBase: Box = useMemo(() => {
    const { center, size } = layout.board.box;
    return { center: [center[0], center[1], center[2] + 1], size: [size[0], size[1], size[2] + 2] };
  }, [layout.board.box]);
  const closed = caseView === "closed" && !!build.case;

  const lights = (
    <>
      <hemisphereLight args={["#eef4f9", "#3a424a", 1.9]} />
      <directionalLight position={[300, 600, 1000]} intensity={2.4} />
      <directionalLight position={[-500, -200, 700]} intensity={1} color="#cfdfee" />
      <Controls resetSignal={resetSignal} />
    </>
  );

  if (closed) {
    return (
      <>
        {lights}
        <Part {...props("case")} boxes={[caseBox]} installed={build.case?.id} animate={false}>
          <WithFallback fallback={<CaseModel layout={layout.case} showGlass={false} />}>
            <FittedModel url={`/models/case-${layout.case.color}.glb`} box={caseBox} axes={CASE_AXES} brightness={layout.case.color === "white" ? WHITE_CASE_BRIGHTNESS : undefined} />
          </WithFallback>
        </Part>
      </>
    );
  }

  return (
    <>
      {lights}

      {/* Only the back wall takes pointer events, so the case never blocks the parts inside it. */}
      <Part {...props("case")} boxes={[backWall]} installed={build.case?.id} animate={false}>
        <CaseBackWall layout={layout.case} />
      </Part>
      {layout.case.present ? <CaseModel layout={layout.case} showGlass={caseView === "glass"} /> : <Outline box={caseBox} color={GHOST} />}

      <Part {...props("motherboard")} boxes={[layout.board.box]} installed={build.motherboard?.id}>
        <WithFallback fallback={<BoardBase box={layout.board.box} />}>
          <FittedModel url="/models/motherboard.glb" box={boardBase} />
        </WithFallback>
        <BoardModel layout={layout} />
      </Part>
      <Part {...props("cpu")} boxes={[layout.cpu.box]} installed={build.cpu?.id}>
        <WithFallback fallback={<CpuModel box={layout.cpu.box} />}>
          <FittedModel url="/models/cpu.glb" box={layout.cpu.box} />
        </WithFallback>
      </Part>
      <Part {...props("ram")} boxes={layout.ram.boxes} installed={build.ram?.id}>
        <WithFallback fallback={<RamModel boxes={layout.ram.boxes} />}>
          {layout.ram.boxes.map((box, i) => (
            <FittedModel key={i} url="/models/ram.glb" box={box} axes={RAM_AXES} />
          ))}
        </WithFallback>
      </Part>
      {!gpuOptional && (
        <Part {...props("gpu")} boxes={[layout.gpu.box]} installed={build.gpu?.id}>
          <WithFallback fallback={<GpuModel box={layout.gpu.box} fans={layout.gpu.fans} />}>
            <FittedModel url="/models/gpu.glb" box={layout.gpu.box} axes={GPU_AXES} />
          </WithFallback>
        </Part>
      )}
      <Part {...props("cooler")} boxes={coolerBoxes} installed={build.cooler?.id}>
        <CoolerModel kind={layout.cooler.kind} base={layout.cooler.base} radiator={layout.cooler.radiator} />
      </Part>
      <Part {...props("psu")} boxes={[layout.psu.box]} installed={build.psu?.id}>
        <PsuModel box={layout.psu.box} />
      </Part>
      {layout.drives.length === 0 && <Part {...props("storage")} boxes={[layout.driveGhost]} />}
      {layout.drives.map((drive) => (
        <Part key={drive.id} {...props("storage")} boxes={[drive.box]} installed={drive.id}>
          {drive.kind === "nvme" ? (
            <WithFallback fallback={<DriveModel drive={drive} />}>
              <FittedModel url="/models/storage.glb" box={drive.box} />
            </WithFallback>
          ) : (
            <DriveModel drive={drive} />
          )}
        </Part>
      ))}
    </>
  );
}

export default function Viewer({ label, fallback, ...scene }: ViewerProps & { label: string; fallback: ReactNode }) {
  return (
    <Boundary fallback={fallback}>
      <Canvas
        flat
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 30, near: 50, far: 8000, position: CAMERA_POSITION.toArray() }}
        aria-label={label}
        onPointerMissed={() => scene.onHover(null)}
      >
        <Scene {...scene} />
      </Canvas>
    </Boundary>
  );
}
