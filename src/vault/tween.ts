/** The one easing curve, parsed from the --ease token (cubic-bezier(x1, y1, x2, y2)). */
export function parseBezier(css: string): [number, number, number, number] {
  const m = /cubic-bezier\(([^)]+)\)/.exec(css);
  const n = m ? m[1].split(',').map(Number) : [];
  return n.length === 4 && n.every(Number.isFinite)
    ? [n[0], n[1], n[2], n[3]]
    : [0.22, 0.61, 0.36, 1];
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const Y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = X(t) - x;
      if (Math.abs(err) < 1e-6) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (X(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
}

/** A retargetable value that eases from where it is now to a new target over a fixed time. */
export class Tween {
  private from: number;
  private to: number;
  private t0 = 0;
  private dur = 0;
  constructor(
    value: number,
    private ease: (x: number) => number,
  ) {
    this.from = this.to = value;
  }
  get target() {
    return this.to;
  }
  value(now: number): number {
    if (this.dur <= 0) return this.to;
    const k = (now - this.t0) / this.dur;
    return k >= 1 ? this.to : this.from + (this.to - this.from) * this.ease(k);
  }
  /** Duration 0 jumps straight to the target. */
  go(target: number, now: number, durationSeconds: number) {
    if (target === this.to) return;
    this.from = this.value(now);
    this.to = target;
    this.t0 = now;
    this.dur = durationSeconds;
  }
}
