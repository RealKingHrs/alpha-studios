import { describe, expect, it } from 'vitest';
import { magnetOffset } from '../src/ui/magnet';

const rect = { left: 100, top: 100, width: 80, height: 40 }; // centre (140, 120)

describe('magnetic buttons', () => {
  it('does nothing when the pointer is far away or exactly at the centre', () => {
    expect(magnetOffset(rect, 600, 600)).toEqual({ x: 0, y: 0 });
    expect(magnetOffset(rect, 140, 120)).toEqual({ x: 0, y: 0 });
  });

  it('leans toward the pointer, by a quarter of the distance, and never more than the cap', () => {
    const near = magnetOffset(rect, 160, 120); // 20px right
    expect(near.x).toBeCloseTo(5, 5);
    expect(near.y).toBeCloseTo(0, 5);
    const far = magnetOffset(rect, 200, 120); // 60px right, inside reach
    expect(far.x).toBe(6);
    const up = magnetOffset(rect, 140, 80);
    expect(up.y).toBeLessThan(0);
    expect(Math.hypot(up.x, up.y)).toBeLessThanOrEqual(6);
  });
});
