/* eslint-disable react-hooks/immutability -- the camera controller is a mutable object read by the frame loop */
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../content/schema';
import { navigate } from '../router';
import { bustPose, buildStops } from './layout';
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
}

/** Where the camera should be for an address. Null for addresses outside the journey. */
function resolveTarget(
  pathname: string,
  base: string,
  snap: Snapshot,
  stopPaths: string[],
): Target | null {
  const path = pathname.startsWith(base) ? '/' + pathname.slice(base.length) : pathname;
  const norm = path.endsWith('/') ? path : path + '/';
  const direct = stopPaths.indexOf(norm);
  if (direct >= 0) return { index: direct, member: null };
  const m = /^\/crew\/([^/]+)\/$/.exec(norm);
  if (m) {
    const member = snap.members.findIndex((x) => x.slug === m[1]);
    if (member >= 0) return { index: stopPaths.indexOf('/crew/'), member };
  }
  return null;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]');

/** The 3D layer: canvas plus every way of moving through it. The address bar stays the source of truth. */
export default function VaultLayer(props: VaultProps) {
  const { snap, pathname, base, mode, reduceMotion, link } = props;
  const tokens = useMemo(() => readTokens(), []);
  const stops = useMemo(() => buildStops(snap.projects.map((p) => p.slug)), [snap]);
  const stopPaths = useMemo(() => stops.map((s) => s.path), [stops]);
  const target = resolveTarget(pathname, base, snap, stopPaths);
  const [fadeKey, setFadeKey] = useState(0);

  const [ctrl] = useState<Ctrl>(() => {
    const ease = cubicBezier(...parseBezier(tokens.ease));
    const t0 = target ?? { index: 0, member: null };
    return {
      progress: new Tween(t0.index, ease),
      detail: new Tween(t0.member === null ? 0 : 1, ease),
      detailPose: t0.member === null ? null : bustPose(t0.member, snap.members.length),
      pointer: { x: 0, y: 0 },
      smooth: { x: 0, y: 0 },
      reduce: reduceMotion,
    };
  });
  useEffect(() => {
    ctrl.reduce = reduceMotion;
  }, [ctrl, reduceMotion]);

  // The address decides where the camera goes; arriving by any route flies the same way.
  const index = target?.index;
  const member = target?.member ?? null;
  useEffect(() => {
    if (index === undefined) return;
    const c = ctrl;
    const now = performance.now() / 1000;
    const hops = Math.abs(index - c.progress.target);
    const fly = reduceMotion ? 0 : tokens.durSlow * (1.6 + 0.5 * Math.min(hops, 4));
    const moved = hops > 0 || (member === null) !== (c.detail.target === 0);
    c.progress.go(index, now, fly);
    if (member !== null) c.detailPose = bustPose(member, snap.members.length);
    c.detail.go(member === null ? 0 : 1, now, reduceMotion ? 0 : tokens.durSlow * 1.4);
    // Reduced motion: a fade replaces the flight, and it is triggered by the address change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reduceMotion && moved) setFadeKey((k) => k + 1);
  }, [ctrl, index, member, reduceMotion, snap.members.length, tokens.durSlow]);

  const current = index ?? 0;
  const goTo = (i: number) => navigate(link(stops[i].path), { replace: true });
  const goRef = useRef({ current, member, goTo });
  useEffect(() => {
    goRef.current = { current, member, goTo };
  });

  // Wheel, keys, swipe. Handlers read the latest position through goRef.
  useEffect(() => {
    const wheel = createWheelStepper();
    const move = (dir: 1 | -1) => {
      const { current: i, goTo: go } = goRef.current;
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
      const { member: mem, goTo: go } = goRef.current;
      const crew = stopPaths.indexOf('/crew/');
      if (mem !== null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const n = snap.members.length;
        const next = (mem + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
        navigate(link(`/crew/${snap.members[next].slug}/`), { replace: true });
      } else if (mem !== null && e.key === 'Escape') {
        go(crew);
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

  const lite = mode === 'lite';
  return (
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
        />
      </Canvas>
      {fadeKey > 0 && <div key={fadeKey} className="vault-fade" />}
    </div>
  );
}
