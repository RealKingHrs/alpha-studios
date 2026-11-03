/* eslint-disable react-hooks/immutability -- the camera controller is a mutable object read by the frame loop */
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../content/schema';
import { navigate } from '../router';
import { bustPose, buildStops, roomPoses } from './layout';
import type { Mode } from './mode';
import { readTokens } from './palette';
import { createWheelStepper, step, swipeDirection } from './path';
import Scene, { type Ctrl } from './Scene';
import { Tween, cubicBezier, parseBezier } from './tween';

export interface VaultProps {
  snap: Snapshot;
  pathname: string;
  base: string;
  mode: Exclude<Mode, 'fallback'>;
  reduceMotion: boolean;
  dev: boolean;
  /** Maps a site path like "/crew/" to the deployed address. */
  link: (path: string) => string;
  onReady: () => void;
  onSlow: () => void;
}

interface Target {
  index: number;
  /** Index of the member whose profile is open, or null. */
  member: number | null;
  /** Index of the project whose room is open, or null. */
  room: number | null;
}

/** Where the camera should be for an address. Null for addresses outside the journey. */
export function resolveTarget(
  pathname: string,
  base: string,
  snap: Snapshot,
  stopPaths: string[],
): Target | null {
  const path = pathname.startsWith(base) ? '/' + pathname.slice(base.length) : pathname;
  const norm = path.endsWith('/') ? path : path + '/';
  const direct = stopPaths.indexOf(norm);
  if (direct >= 0) return { index: direct, member: null, room: null };
  const m = /^\/crew\/([^/]+)\/$/.exec(norm);
  if (m) {
    const member = snap.members.findIndex((x) => x.slug === m[1]);
    if (member >= 0) return { index: stopPaths.indexOf('/crew/'), member, room: null };
  }
  const r = /^\/projects\/([^/]+)\/room\/$/.exec(norm);
  if (r) {
    const room = snap.projects.findIndex((x) => x.slug === r[1]);
    if (room >= 0) return { index: stopPaths.indexOf(`/projects/${r[1]}/`), member: null, room };
  }
  return null;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]');

type RoomState = 'idle' | 'loading' | 'ready' | 'error';

/** The 3D layer: canvas plus every way of moving through it. The address bar stays the source of truth. */
export default function VaultLayer(props: VaultProps) {
  const { snap, pathname, base, mode, reduceMotion, link } = props;
  const tokens = useMemo(() => readTokens(), []);
  const stops = useMemo(() => buildStops(snap.projects.map((p) => p.slug)), [snap]);
  const stopPaths = useMemo(() => stops.map((s) => s.path), [stops]);
  const target = resolveTarget(pathname, base, snap, stopPaths);
  const [fadeKey, setFadeKey] = useState(0);
  const [mountedRoom, setMountedRoom] = useState<number | null>(target?.room ?? null);
  const [roomState, setRoomState] = useState<RoomState>(target?.room != null ? 'loading' : 'idle');
  const [online, setOnline] = useState(() => navigator.onLine);

  const [ctrl] = useState<Ctrl>(() => {
    const ease = cubicBezier(...parseBezier(tokens.ease));
    const t0 = target ?? { index: 0, member: null, room: null };
    return {
      progress: new Tween(t0.index, ease),
      detail: new Tween(t0.member === null ? 0 : 1, ease),
      detailPose: t0.member === null ? null : bustPose(t0.member, snap.members.length),
      room: new Tween(t0.room === null ? 0 : 2, ease),
      roomPoses: t0.room === null ? null : roomPoses(t0.room, stops[t0.index].pose),
      pointer: { x: 0, y: 0 },
      smooth: { x: 0, y: 0 },
      reduce: reduceMotion,
    };
  });
  useEffect(() => {
    ctrl.reduce = reduceMotion;
  }, [ctrl, reduceMotion]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);

  // The address decides where the camera goes; arriving by any route flies the same way.
  const index = target?.index;
  const member = target?.member ?? null;
  const room = target?.room ?? null;
  const unmountTimer = useRef<number>(0);
  useEffect(() => {
    if (index === undefined) return;
    const c = ctrl;
    const now = performance.now() / 1000;
    const hops = Math.abs(index - c.progress.target);
    const fly = reduceMotion ? 0 : tokens.durSlow * (1.6 + 0.5 * Math.min(hops, 4));
    const doorSeconds = reduceMotion ? 0 : tokens.durSlow * 2.4;
    const leavingRoom = room === null && c.room.target > 0;
    const moved =
      hops > 0 ||
      (member === null) !== (c.detail.target === 0) ||
      (room === null) !== (c.room.target === 0);

    // Leaving a room: back out through the doorway first, then travel on.
    c.progress.go(index, now, fly, leavingRoom ? now + doorSeconds : now);
    if (member !== null) c.detailPose = bustPose(member, snap.members.length);
    c.detail.go(member === null ? 0 : 1, now, reduceMotion ? 0 : tokens.durSlow * 1.4);

    window.clearTimeout(unmountTimer.current);
    if (room !== null) {
      c.roomPoses = roomPoses(room, stops[index].pose);
      // Entering: arrive at the pedestal first, then go through the doorway.
      c.room.go(2, now, doorSeconds * 1.25, now + (hops > 0 ? fly : 0));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMountedRoom(room);
      setRoomState((s) => (mountedRoom === room && s !== 'idle' ? s : 'loading'));
    } else {
      c.room.go(0, now, doorSeconds);
      if (mountedRoom !== null) {
        unmountTimer.current = window.setTimeout(
          () => {
            setMountedRoom(null);
            setRoomState('idle');
          },
          doorSeconds * 1000 + 250,
        );
      }
    }
    // Reduced motion: a fade replaces the flight, and it is triggered by the address change.
    if (reduceMotion && moved) setFadeKey((k) => k + 1);
    // mountedRoom is read for the unmount decision only; it must not retrigger the flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl, index, member, room, reduceMotion, snap.members.length, stops, tokens.durSlow]);

  const current = index ?? 0;
  const goTo = (i: number) => navigate(link(stops[i].path), { replace: true });
  const goRef = useRef({ current, member, room, goTo });
  useEffect(() => {
    goRef.current = { current, member, room, goTo };
  });

  // Wheel, keys, swipe. Handlers read the latest position through goRef.
  useEffect(() => {
    const wheel = createWheelStepper();
    const move = (dir: 1 | -1) => {
      const { current: i, room: inRoom, goTo: go } = goRef.current;
      // From inside a room, any step backs out to the pedestal first.
      if (inRoom !== null) return go(i);
      const next = step(i, dir, stops.length);
      if (next !== i) go(next);
    };
    const onWheel = (e: WheelEvent) => {
      if (isTyping(e.target)) return;
      const panel = (e.target as HTMLElement).closest?.('.page') as HTMLElement | null;
      if (panel && panel.scrollHeight > panel.clientHeight) return;
      const dir = wheel(e.deltaY || e.deltaX, e.timeStamp);
      if (dir) move(dir);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      const { member: mem, room: inRoom, goTo: go } = goRef.current;
      const crew = stopPaths.indexOf('/crew/');
      if (mem !== null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const n = snap.members.length;
        const next = (mem + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
        navigate(link(`/crew/${snap.members[next].slug}/`), { replace: true });
      } else if (mem !== null && e.key === 'Escape') {
        go(crew);
      } else if (inRoom !== null && e.key === 'Escape') {
        go(goRef.current.current);
      } else if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) move(1);
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) move(-1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(stops.length - 1);
      else return;
      e.preventDefault();
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerType === 'mouse') return;
      const dir = swipeDirection(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (dir) move(dir);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      ctrl.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      ctrl.pointer.y = -((e.clientY / innerHeight) * 2 - 1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
    };
  }, [ctrl, stops, stopPaths, snap.members, link]);

  const onRoomReady = useCallback(() => setRoomState('ready'), []);
  const onRoomError = useCallback(() => setRoomState('error'), []);

  const lite = mode === 'lite';
  const notice =
    roomState === 'error'
      ? 'This room could not be loaded. The text beside it is complete.'
      : roomState === 'loading' && !online
        ? 'You are offline. This room has not loaded yet; the text beside it is available.'
        : roomState === 'loading'
          ? 'Loading the room.'
          : null;
  return (
    <>
      <div className="vault-layer" aria-hidden="true">
        <Canvas
          dpr={lite ? [1, 1.25] : [1, 2]}
          camera={{ fov: 52, near: 0.1, far: 120, position: [0, 1.7, 4] }}
          gl={{ antialias: !lite, powerPreference: 'high-performance' }}
        >
          <Scene
            snap={snap}
            stops={stops}
            mode={mode}
            tokens={tokens}
            ctrl={ctrl}
            dev={props.dev}
            onReady={props.onReady}
            onSlow={props.onSlow}
            onPick={(path) => navigate(link(path))}
            parallax={!lite}
            roomIndex={mountedRoom}
            base={base}
            onRoomReady={onRoomReady}
            onRoomError={onRoomError}
          />
        </Canvas>
        {fadeKey > 0 && <div key={fadeKey} className="vault-fade" />}
      </div>
      {notice && (
        <div className="vault-notice" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
