/** Screen-shape logic for the motion layer. Pure, so the same decision is made, and tested, for every screen. */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Where stacking panels stick: a tenth of the screen's height, kept between 76 and 108 px. */
export const stickyTopFor = (viewportHeight: number) =>
  Math.round(clamp(viewportHeight * 0.1, 76, 108));

/** The gap by which each later panel sticks below the one before it. */
export const STACK_STEP = 16;

/**
 * Whether panels should stack at all. They only stack when every panel fits on the screen with its sticky offset,
 * and the screen is wide enough for two columns. Otherwise they simply scroll past one another, which is always correct.
 */
export function canStack(
  panelHeights: number[],
  viewportHeight: number,
  viewportWidth: number,
): boolean {
  if (panelHeights.length < 2 || viewportWidth < 900) return false;
  const top = stickyTopFor(viewportHeight);
  const room = viewportHeight - top - (panelHeights.length - 1) * STACK_STEP - 16;
  return panelHeights.every((h) => h <= room);
}

/** Marquee speed follows the screen's width, so it feels the same on a phone and on an ultrawide. */
export const marqueeBase = (viewportWidth: number) =>
  Math.round(46 * clamp(viewportWidth / 1440, 0.6, 1.6));

/** How far, in percent of its own height, a layer drifts across the scroll of its stage. Bigger factor, more drift. */
export const driftPercent = (factor: number) => `${(factor * 9).toFixed(1)}%`;
