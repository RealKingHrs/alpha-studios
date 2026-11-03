/* eslint-disable react-hooks/immutability -- frame callbacks mutate shared camera state outside render */
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { BOWL_PATH, BOWL_TRANSFORM, MARK_VIEWBOX, STEM_PATH } from '../brand/mark';
import type { Snapshot } from '../content/schema';
import { stats, transferredBytes } from '../dev/stats';
import { Bust } from './Bust';
import { isTap, useCursor } from './interact';
import {
  ALCOVE_Z,
  CORRIDOR,
  CREW_CENTER,
  CREW_RADIUS,
  CREW_SPAN_DEG,
  DOOR_Z,
  HALL_Z,
  ROOM,
  roomSide,
  bustPlacement,
  pedestalPosition,
  type Pose,
  type Stop,
} from './layout';
import { createFrameMonitor, type Mode } from './mode';
import type { Tokens } from './palette';
import { blendPose, poseAt, roomPoseAt } from './path';
import type { Tween } from './tween';

/** Shared, mutable camera state. Lives in a ref so frames never trigger React renders. */
export interface Ctrl {
  progress: Tween;
  detail: Tween;
  detailPose: Pose | null;
  /** 0 at the pedestal, 1 in the doorway, 2 inside the room. */
  room: Tween;
  roomPoses: [Pose, Pose, Pose] | null;
  pointer: { x: number; y: number };
  smooth: { x: number; y: number };
  reduce: boolean;
}

interface SceneProps {
  snap: Snapshot;
  stops: Stop[];
  mode: Exclude<Mode, 'fallback'>;
  tokens: Tokens;
  ctrl: Ctrl;
  dev: boolean;
  onReady: () => void;
  onSlow: () => void;
  onPick: (path: string) => void;
  /** True when pointer movement may shift the view. */
  parallax: boolean;
  /** Project whose room is mounted, or null. */
  roomIndex: number | null;
  base: string;
  onRoomReady: () => void;
  onRoomError: () => void;
}

function CameraRig({ stops, ctrl, parallax }: Pick<SceneProps, 'stops' | 'ctrl' | 'parallax'>) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = useRef(new THREE.Vector3());
  useFrame(() => {
    const c = ctrl;
    const now = performance.now() / 1000;
    let pose = poseAt(stops, c.progress.value(now));
    const d = c.detail.value(now);
    if (c.detailPose && d > 0.0005) pose = blendPose(pose, c.detailPose, d);
    const r = c.room.value(now);
    if (c.roomPoses && r > 0.0005) pose = roomPoseAt(c.roomPoses, r);
    c.smooth.x += (c.pointer.x - c.smooth.x) * 0.06;
    c.smooth.y += (c.pointer.y - c.smooth.y) * 0.06;
    const k = parallax && !c.reduce ? 1 : 0;
    camera.position.set(
      pose.pos[0] + c.smooth.x * 0.3 * k,
      pose.pos[1] + c.smooth.y * 0.12 * k,
      pose.pos[2],
    );
    look.current.set(
      pose.look[0] + c.smooth.x * 0.5 * k,
      pose.look[1] + c.smooth.y * 0.2 * k,
      pose.look[2],
    );
    camera.lookAt(look.current);
    // Portrait screens see less sideways, so widen the lens to keep each beat in frame.
    const cam = camera as THREE.PerspectiveCamera;
    const fov = cam.aspect < 1 ? 52 + (1 - cam.aspect) * 42 : 52;
    // On tall screens the text panel covers the lower part, so shift the picture up above it.
    const shift = cam.aspect < 1 ? size.height * 0.2 : 0;
    if (Math.abs(cam.fov - fov) > 0.01 || cam.view?.offsetY !== shift) {
      cam.fov = fov;
      if (shift) cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

/** Signals the first frame, feeds the frame-rate watchdog and the dev panel. */
function Telemetry({
  dev,
  mode,
  onReady,
  onSlow,
}: Pick<SceneProps, 'dev' | 'mode' | 'onReady' | 'onSlow'>) {
  const [count] = useState(() => ({ frames: 0 }));
  const monitor = useMemo(() => createFrameMonitor(onSlow), [onSlow]);
  useFrame((state, dt) => {
    monitor.tick(dt);
    count.frames++;
    if (count.frames === 3) {
      stats.readyAt = performance.now();
      stats.bytesAtReady = transferredBytes();
      onReady();
    }
    if (dev) {
      // The reflective floor renders a second pass, so count a whole frame: reset by hand here,
      // before this frame's render, and read what the previous frame accumulated.
      const info = state.gl.info;
      info.autoReset = false;
      stats.fps = monitor.fps;
      stats.frameMs = dt * 1000;
      stats.calls = info.render.calls;
      stats.triangles = info.render.triangles;
      stats.mode = mode;
      info.reset();
    }
  });
  return null;
}

/** The alpha mark, extruded from the same outlines as the intro. Chrome, with the flick fading to gold. */
function AlphaLogo({
  tokens,
  mode,
  reduce,
}: {
  tokens: Tokens;
  mode: SceneProps['mode'];
  reduce: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { bowl, stem } = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><g transform="${BOWL_TRANSFORM}"><path fill-rule="evenodd" d="${BOWL_PATH}"/></g><path d="${STEM_PATH}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const opts = {
      depth: 12,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 1.5,
      bevelSegments: mode === 'lite' ? 1 : 3,
      curveSegments: mode === 'lite' ? 8 : 20,
    };
    const chrome = new THREE.Color(tokens.chrome);
    const gold = new THREE.Color(tokens.gold);
    const build = (i: number, flick: boolean) => {
      const geo = new THREE.ExtrudeGeometry(SVGLoader.createShapes(data.paths[i]), opts);
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const y = pos.getY(v);
        // Only the tail of the stem turns gold: one gold element on the mark.
        const f = flick ? THREE.MathUtils.smoothstep(x + (y - 120) * 0.6, 135, 195) : 0;
        c.copy(chrome).lerp(gold, f);
        col.set([c.r, c.g, c.b], v * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return geo;
    };
    return { bowl: build(0, false), stem: build(1, true) };
  }, [tokens, mode]);

  useFrame(({ clock }) => {
    if (group.current && !reduce)
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.14;
  });
  const material = (
    <meshStandardMaterial
      vertexColors
      metalness={mode === 'lite' ? 0.35 : 1}
      roughness={mode === 'lite' ? 0.35 : 0.22}
    />
  );
  return (
    <group ref={group} position={[0, 2.35, -3]}>
      <group scale={[0.022, -0.022, 0.022]}>
        <group position={[-108, -100, -6]}>
          <mesh geometry={bowl}>{material}</mesh>
          <mesh geometry={stem}>{material}</mesh>
        </group>
      </group>
    </group>
  );
}

function Floor({ tokens, mode }: { tokens: Tokens; mode: SceneProps['mode'] }) {
  const len = CORRIDOR.front - CORRIDOR.back;
  const cz = (CORRIDOR.front + CORRIDOR.back) / 2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, cz]}>
      <planeGeometry args={[CORRIDOR.width, len]} />
      {mode === 'full' ? (
        <MeshReflectorMaterial
          color={tokens.graphite}
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={22}
          roughness={0.9}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          metalness={0.6}
          mirror={0}
        />
      ) : (
        <meshStandardMaterial color={tokens.graphite} roughness={0.3} metalness={0.4} />
      )}
    </mesh>
  );
}

/** Repeated wall ribs as one instanced draw call per side. */
function Ribs({ tokens }: { tokens: Tokens }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spacing = 4;
  const count = Math.floor((CORRIDOR.front - CORRIDOR.back) / spacing) * 2;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let z = CORRIDOR.front - 2; z > CORRIDOR.back + 1; z -= spacing) {
        o.position.set(side * (CORRIDOR.width / 2 - 0.25), CORRIDOR.height / 2, z);
        o.updateMatrix();
        if (i < count) m.setMatrixAt(i++, o.matrix);
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.35, CORRIDOR.height, 0.5]} />
      <meshStandardMaterial color={tokens.graphite} roughness={0.7} metalness={0.2} />
    </instancedMesh>
  );
}

/** Wall pieces along z, leaving a gap at each doorway. */
function wallPieces(gaps: number[]): Array<{ z0: number; z1: number }> {
  const half = ROOM.doorW / 2;
  const cuts = [...gaps].sort((a, b) => b - a);
  const pieces: Array<{ z0: number; z1: number }> = [];
  let from = CORRIDOR.front;
  for (const g of cuts) {
    pieces.push({ z0: from, z1: g + half });
    from = g - half;
  }
  pieces.push({ z0: from, z1: CORRIDOR.back });
  return pieces;
}

function Shell({ tokens, doorSides }: { tokens: Tokens; doorSides: Array<-1 | 1> }) {
  const len = CORRIDOR.front - CORRIDOR.back;
  const cz = (CORRIDOR.front + CORRIDOR.back) / 2;
  const w = CORRIDOR.width;
  const h = CORRIDOR.height;
  const dark = <meshStandardMaterial color={tokens.obsidian} roughness={0.95} metalness={0} />;
  return (
    <group>
      {([-1, 1] as const).map((side) => {
        const gaps = doorSides.includes(side) ? [HALL_Z] : [];
        return (
          <group key={side}>
            {wallPieces(gaps).map((p) => (
              <mesh key={p.z0} position={[side * (w / 2), h / 2, (p.z0 + p.z1) / 2]}>
                <boxGeometry args={[0.3, h, p.z0 - p.z1]} />
                {dark}
              </mesh>
            ))}
            {gaps.length > 0 && (
              <>
                <mesh position={[side * (w / 2), (h + ROOM.doorH) / 2, HALL_Z]}>
                  <boxGeometry args={[0.3, h - ROOM.doorH, ROOM.doorW]} />
                  {dark}
                </mesh>
                {/* chrome frame around the doorway */}
                {[-1, 1].map((k) => (
                  <mesh
                    key={k}
                    position={[
                      side * (w / 2),
                      ROOM.doorH / 2,
                      HALL_Z + (k * (ROOM.doorW + 0.12)) / 2,
                    ]}
                  >
                    <boxGeometry args={[0.36, ROOM.doorH, 0.12]} />
                    <meshStandardMaterial color={tokens.chrome} roughness={0.25} metalness={0.9} />
                  </mesh>
                ))}
                <mesh position={[side * (w / 2), ROOM.doorH, HALL_Z]}>
                  <boxGeometry args={[0.36, 0.12, ROOM.doorW + 0.24]} />
                  <meshStandardMaterial color={tokens.chrome} roughness={0.25} metalness={0.9} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
      <mesh position={[0, h, cz]}>
        <boxGeometry args={[w, 0.3, len]} />
        {dark}
      </mesh>
      <mesh position={[0, h / 2, CORRIDOR.back]}>
        <boxGeometry args={[w, h, 0.3]} />
        {dark}
      </mesh>
      <Ribs tokens={tokens} />
      {/* Hairlines along the floor edge */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.6), 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, len]} />
          <meshBasicMaterial color={tokens.line} />
        </mesh>
      ))}
    </group>
  );
}

function Pedestal({
  tokens,
  position,
  featured,
  reduce,
  onPick,
}: {
  tokens: Tokens;
  position: [number, number, number];
  featured: boolean;
  reduce: boolean;
  onPick: () => void;
}) {
  const object = useRef<THREE.Mesh>(null);
  const cursor = useCursor();
  useFrame(({ clock }) => {
    if (object.current && !reduce) object.current.rotation.y = clock.elapsedTime * 0.3;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.6, 0.66, 1.1, 48]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* The single gold element in the hall: the featured project's ring */}
      {featured && (
        <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.02, 12, 64]} />
          <meshStandardMaterial
            color={tokens.gold}
            emissive={tokens.gold}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
      {/* Placeholder for the app: a floating device slab */}
      <mesh ref={object} position={[0, 1.95, 0]}>
        <boxGeometry args={[0.52, 1.05, 0.06]} />
        <meshStandardMaterial color={tokens.chrome} roughness={0.25} metalness={0.8} />
      </mesh>
      {/* Larger invisible target so the pedestal is easy to pick */}
      <mesh
        position={[0, 1.4, 0]}
        visible={false}
        onClick={(e) => isTap(e) && (e.stopPropagation(), onPick())}
        {...cursor}
      >
        <cylinderGeometry args={[0.9, 0.9, 2.8, 12]} />
      </mesh>
    </group>
  );
}

function CrewPlatform({ tokens }: { tokens: Tokens }) {
  const half = ((CREW_SPAN_DEG / 2 + 9) * Math.PI) / 180;
  const start = Math.PI / 2 - half;
  return (
    <group position={CREW_CENTER}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[CREW_RADIUS - 1.5, CREW_RADIUS + 1.6, 64, 1, start, half * 2]} />
        <meshStandardMaterial
          color={tokens.graphite}
          roughness={0.35}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[CREW_RADIUS + 1.6, CREW_RADIUS + 1.66, 64, 1, start, half * 2]} />
        <meshBasicMaterial color={tokens.line} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Alcove({ tokens }: { tokens: Tokens }) {
  const panel = <meshStandardMaterial color={tokens.graphite} roughness={0.6} metalness={0.2} />;
  return (
    <group position={[0, 0, ALCOVE_Z]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[6.4, 0.1, 6]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.8, -3.2]}>
        <boxGeometry args={[6.4, 3.6, 0.2]} />
        {panel}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 3.2, 1.8, -0.8]}>
          <boxGeometry args={[0.2, 3.6, 4.8]} />
          {panel}
        </mesh>
      ))}
      <mesh position={[0, 3.7, -0.6]}>
        <boxGeometry args={[6.8, 0.2, 5.2]} />
        {panel}
      </mesh>
      <mesh position={[0, 0.3, -1.4]}>
        <boxGeometry args={[2.6, 0.5, 0.8]} />
        <meshStandardMaterial color={tokens.silver} roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, 1.7, -3.05]}>
        <torusGeometry args={[0.7, 0.05, 16, 64]} />
        <meshStandardMaterial color={tokens.chrome} roughness={0.2} metalness={0.9} />
      </mesh>
    </group>
  );
}

/** The door at the far end. Its keyhole glows emerald: it is the one thing here you can act on. */
function KeyholeDoor({ tokens, onPick }: { tokens: Tokens; onPick: () => void }) {
  const cursor = useCursor();
  const glow = <meshBasicMaterial color={tokens.emeraldGlow} toneMapped={false} />;
  return (
    <group position={[0, 0, DOOR_Z]}>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[3.8, 4.8, 0.2]} />
        <meshStandardMaterial color={tokens.chrome} roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[0, 2.3, 0.12]}>
        <boxGeometry args={[3.3, 4.4, 0.1]} />
        <meshStandardMaterial color={tokens.graphite} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.35, 0.19]}>
        <circleGeometry args={[0.2, 32]} />
        {glow}
      </mesh>
      <mesh position={[0, 1.98, 0.19]}>
        <planeGeometry args={[0.13, 0.5]} />
        {glow}
      </mesh>
      <mesh
        position={[0, 2.3, 0.4]}
        visible={false}
        onClick={(e) => isTap(e) && (e.stopPropagation(), onPick())}
        {...cursor}
      >
        <boxGeometry args={[3.8, 4.8, 0.4]} />
      </mesh>
    </group>
  );
}

function Lights({
  tokens,
  mode,
  pedestals,
}: {
  tokens: Tokens;
  mode: SceneProps['mode'];
  pedestals: number[];
}) {
  const L = (
    p: [number, number, number],
    intensity: number,
    distance: number,
    color = tokens.chrome,
  ) => (
    <pointLight
      key={p.join()}
      position={p}
      intensity={intensity}
      distance={distance}
      decay={2}
      color={color}
    />
  );
  if (mode === 'lite') {
    return (
      <>
        <ambientLight intensity={0.35} />
        {L([0, 4.5, -1], 70, 16)}
        {L([0, 4.2, HALL_Z + 2], 90, 14)}
        {L([0, 4.5, -32], 110, 18)}
        {L([0, 3.2, ALCOVE_Z + 1], 60, 10)}
        {L([0, 1.6, DOOR_Z + 2], 25, 8, tokens.emeraldGlow)}
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.18} />
      {L([0, 4.6, -1], 60, 14)}
      {L([0, 1.2, 3], 12, 8)}
      {L([0, 4.6, -10], 40, 12)}
      {pedestals.map((x) => L([x, 4.2, HALL_Z + 0.8], 55, 9))}
      {L([-5, 4.6, -35], 70, 12)}
      {L([0, 4.6, -37], 70, 12)}
      {L([5, 4.6, -35], 70, 12)}
      {L([0, 3.2, ALCOVE_Z + 1], 45, 9)}
      {L([0, 1.6, DOOR_Z + 2], 20, 7, tokens.emeraldGlow)}
    </>
  );
}

const Room = lazy(() => import('./rooms/Room'));

/** If a room fails to load or draw, tell the page and leave the corridor working. */
class RoomBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Scene(props: SceneProps) {
  const { snap, tokens, mode, ctrl, onPick } = props;
  const n = snap.projects.length;
  const m = snap.members.length;
  const featured = snap.projects.findIndex((p) => p.featured);
  const pedestalXs = snap.projects.map((_, i) => pedestalPosition(i, n)[0]);

  // Release the cursor if the scene unmounts while hovering something.
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  return (
    <>
      <color attach="background" args={[tokens.obsidian]} />
      <fog attach="fog" args={[tokens.obsidian, 6, mode === 'lite' ? 32 : 48]} />
      {mode === 'full' && (
        <Environment resolution={128} background={false}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, -4]} scale={[10, 3, 1]} />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[-6, 2, -20]}
            rotation-y={Math.PI / 2}
            scale={[20, 2, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[6, 2, -20]}
            rotation-y={-Math.PI / 2}
            scale={[20, 2, 1]}
          />
        </Environment>
      )}
      <Lights tokens={tokens} mode={mode} pedestals={pedestalXs} />
      <CameraRig stops={props.stops} ctrl={ctrl} parallax={props.parallax} />
      <Telemetry dev={props.dev} mode={mode} onReady={props.onReady} onSlow={props.onSlow} />
      <Shell tokens={tokens} doorSides={[...new Set(snap.projects.map((_, i) => roomSide(i)))]} />
      <Floor tokens={tokens} mode={mode} />
      <AlphaLogo tokens={tokens} mode={mode} reduce={ctrl.reduce} />
      {snap.projects.map((p, i) => (
        <Pedestal
          key={p.slug}
          tokens={tokens}
          position={pedestalPosition(i, n)}
          featured={i === featured}
          reduce={ctrl.reduce}
          onPick={() => onPick(`/projects/${p.slug}/`)}
        />
      ))}
      <CrewPlatform tokens={tokens} />
      {snap.members.map((mem, i) => {
        const { pos, rotY } = bustPlacement(i, m);
        return (
          <Bust
            key={mem.slug}
            tokens={tokens}
            position={pos}
            rotY={rotY}
            record={mem.avatar}
            reduce={ctrl.reduce}
            onPick={() => onPick(`/crew/${mem.slug}/`)}
          />
        );
      })}
      <Alcove tokens={tokens} />
      <KeyholeDoor tokens={tokens} onPick={() => onPick('/portal/')} />
      {props.roomIndex !== null && (
        <RoomBoundary key={props.roomIndex} onError={props.onRoomError}>
          <Suspense fallback={null}>
            <Room
              snap={snap}
              index={props.roomIndex}
              tokens={tokens}
              reduce={ctrl.reduce}
              base={props.base}
              onReady={props.onRoomReady}
              onPick={onPick}
            />
          </Suspense>
        </RoomBoundary>
      )}
    </>
  );
}
