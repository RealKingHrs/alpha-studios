/** Pure maths and text helpers for the motion layer. Kept free of the browser so they can be tested. */

/** Words of a heading, in order. Runs of spaces collapse. */
export const splitWords = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** Seconds to wait before word `i` starts, so words arrive one after another. */
export const staggerDelay = (i: number, step = 0.07, max = 0.9) => Math.min(max, i * step);

/**
 * Moves a scrolling band one frame. The band is made of identical copies, so when it has travelled one
 * copy's width it jumps back by exactly that width and nobody sees the seam. Scroll speed makes it faster,
 * in either direction, but it always keeps drifting the same way.
 */
export function marqueeStep(
  x: number,
  dtSeconds: number,
  scrollVelocity: number,
  copyWidth: number,
  base = 70,
) {
  if (copyWidth <= 0) return 0;
  const speed = base + Math.min(900, Math.abs(scrollVelocity) * 0.35);
  let next = x - speed * dtSeconds;
  while (next <= -copyWidth) next += copyWidth;
  return next;
}

/** The skew, in degrees, a band leans by while the page is scrolling: bounded so it never looks broken. */
export const velocitySkew = (velocity: number, max = 7) =>
  Math.max(-max, Math.min(max, velocity / 220));

/** How far a panel covered by the next one has shrunk: 0 untouched, 1 fully covered. Smooth at both ends. */
export function coverAmount(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}
export const coverScale = (progress: number, min = 0.94) => 1 - (1 - min) * coverAmount(progress);

/** Tilt in degrees toward the pointer for a panel: pointer position relative to the panel's centre. */
export function tiltFor(
  pointer: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  max = 7,
) {
  const nx = ((pointer.x - rect.left) / rect.width - 0.5) * 2;
  const ny = ((pointer.y - rect.top) / rect.height - 0.5) * 2;
  const c = (n: number) => Math.max(-1, Math.min(1, n));
  return { rotateY: c(nx) * max, rotateX: -c(ny) * max };
}

/** Which section is current, given each section's top edge: the last one whose top has passed the line. */
export function currentSection(tops: number[], line: number): number {
  let current = 0;
  tops.forEach((t, i) => {
    if (t <= line) current = i;
  });
  return current;
}

/** The two timings of a page change, in milliseconds: when the old page is fully covered, and when it is done. */
export const WIPE = { cover: 240, total: 600 } as const;

/**
 * How far the panel behind is covered by the one scrolling over it, 0 to 1. `nextTop` is the covering
 * panel's top edge on screen; it starts a full screen below and ends at the sticky line.
 */
export function coverProgress(nextTop: number, viewportHeight: number, stickyTop: number) {
  const span = viewportHeight - stickyTop;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (viewportHeight - nextTop) / span));
}
