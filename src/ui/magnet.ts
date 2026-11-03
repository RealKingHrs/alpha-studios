export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * How far to nudge an element toward the pointer: nothing beyond `radius` pixels from its centre,
 * a quarter of the distance inside it, and never more than `max` pixels, so it follows but never runs away.
 */
export function magnetOffset(rect: Rect, px: number, py: number, radius = 70, max = 6) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  const reach = radius + Math.max(rect.width, rect.height) / 2;
  if (dist > reach || dist === 0) return { x: 0, y: 0 };
  const pull = Math.min(max, dist * 0.25);
  return { x: (dx / dist) * pull, y: (dy / dist) * pull };
}
