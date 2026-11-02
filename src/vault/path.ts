import type { Pose, Stop, Vec3 } from './layout';

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const clampIndex = (i: number, n: number) => Math.max(0, Math.min(n - 1, i));

/** Camera pose at a fractional position along the stops. */
export function poseAt(stops: Stop[], progress: number): Pose {
  const p = Math.max(0, Math.min(stops.length - 1, progress));
  const i = Math.min(stops.length - 2, Math.floor(p));
  const t = smooth(p - i);
  const a = stops[i].pose;
  const b = stops[i + 1].pose;
  return { pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t) };
}

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  return { pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t) };
}

export function stopIndexForPath(stops: Stop[], path: string): number {
  return stops.findIndex((s) => s.path === path);
}

/** Step one stop forward or back, staying inside the path. */
export const step = (index: number, dir: 1 | -1, n: number) => clampIndex(index + dir, n);

/**
 * Wheel and trackpad input arrives in bursts. Accumulate it and release one step per burst,
 * then hold off until the camera has had time to travel.
 */
export function createWheelStepper(threshold = 40, cooldownMs = 650) {
  let acc = 0;
  let lockedUntil = 0;
  return (deltaY: number, nowMs: number): 1 | -1 | 0 => {
    if (nowMs < lockedUntil) {
      acc = 0;
      return 0;
    }
    acc += deltaY;
    if (Math.abs(acc) < threshold) return 0;
    const dir = acc > 0 ? 1 : -1;
    acc = 0;
    lockedUntil = nowMs + cooldownMs;
    return dir;
  };
}

/** Swipe direction from a drag: finger moving up or left goes forward. */
export function swipeDirection(dx: number, dy: number, min = 40): 1 | -1 | 0 {
  const main = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
  if (Math.abs(main) < min) return 0;
  return main < 0 ? 1 : -1;
}
