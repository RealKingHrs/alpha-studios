import { describe, expect, it } from 'vitest';
import { lookVector } from '../src/avatar/look';
import {
  coverAmount,
  coverProgress,
  coverScale,
  currentSection,
  marqueeStep,
  splitWords,
  staggerDelay,
  tiltFor,
  velocitySkew,
} from '../src/site/motion/helpers';
import { magnetOffset } from '../src/ui/magnet';

describe('headline words', () => {
  it('splits a heading into words and stagger delays that never run away', () => {
    expect(splitWords('  The people   behind it ')).toEqual(['The', 'people', 'behind', 'it']);
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBeCloseTo(0.14, 5);
    expect(staggerDelay(500)).toBe(0.9);
  });
});

describe('the marquee', () => {
  it('always drifts left and wraps by exactly one copy, so the seam never shows', () => {
    const w = 800;
    let x = 0;
    for (let i = 0; i < 2000; i++) {
      const next = marqueeStep(x, 1 / 60, 0, w);
      expect(next).toBeLessThanOrEqual(0);
      expect(next).toBeGreaterThan(-w);
      x = next;
    }
  });

  it('speeds up with scrolling in either direction, but is capped', () => {
    const slow = marqueeStep(0, 1, 0, 100000);
    const fast = marqueeStep(0, 1, 1500, 100000);
    const back = marqueeStep(0, 1, -1500, 100000);
    expect(fast).toBeLessThan(slow);
    expect(back).toBeCloseTo(fast, 5);
    expect(marqueeStep(0, 1, 1e9, 1e9)).toBeGreaterThan(-1000);
  });

  it('leans with scroll speed within a few degrees, and not at all when still', () => {
    expect(velocitySkew(0)).toBe(0);
    expect(velocitySkew(1e6)).toBe(7);
    expect(velocitySkew(-1e6)).toBe(-7);
  });

  it('survives a zero width', () => {
    expect(marqueeStep(-5, 1, 0, 0)).toBe(0);
  });
});

describe('stacking panels', () => {
  it('counts a panel as uncovered until the next one reaches the screen, and covered when it arrives', () => {
    expect(coverProgress(900, 900, 108)).toBe(0);
    expect(coverProgress(108, 900, 108)).toBe(1);
    expect(coverProgress(-50, 900, 108)).toBe(1);
    expect(coverProgress(504, 900, 108)).toBeCloseTo(0.5, 5);
    expect(coverProgress(10, 100, 200)).toBe(0);
  });

  it('eases in and out at both ends and shrinks the panel only a little', () => {
    expect(coverAmount(0)).toBe(0);
    expect(coverAmount(1)).toBe(1);
    expect(coverAmount(0.5)).toBeCloseTo(0.5, 5);
    expect(coverAmount(0.1)).toBeLessThan(0.1);
    expect(coverScale(0)).toBe(1);
    expect(coverScale(1)).toBeCloseTo(0.94, 5);
  });
});

describe('pointer effects', () => {
  const rect = { left: 100, top: 100, width: 400, height: 200 };

  it('tilts a panel toward the pointer and stays within the limit', () => {
    expect(tiltFor({ x: 300, y: 200 }, rect, 8)).toEqual({ rotateY: 0, rotateX: -0 });
    const right = tiltFor({ x: 500, y: 200 }, rect, 8);
    expect(right.rotateY).toBe(8);
    const above = tiltFor({ x: 300, y: 100 }, rect, 8);
    expect(above.rotateX).toBe(8);
    expect(tiltFor({ x: 9999, y: -9999 }, rect, 8).rotateY).toBe(8);
  });

  it('turns a character toward the pointer, by how far it is, up to a limit', () => {
    const face = { left: 400, top: 300, width: 200, height: 200 };
    const vp = { w: 1400, h: 900 };
    expect(lookVector({ x: 500, y: 384 }, face, vp)).toEqual({ x: 0, y: 0 });
    expect(lookVector({ x: 1400, y: 384 }, face, vp).x).toBe(1);
    expect(lookVector({ x: 0, y: 384 }, face, vp).x).toBe(-1);
    expect(lookVector({ x: 500, y: 0 }, face, vp).y).toBe(-1);
    expect(lookVector({ x: 700, y: 384 }, face, vp).x).toBeGreaterThan(0);
  });

  it('pulls a button toward the pointer by a quarter of the distance, within a cap', () => {
    const b = { left: 100, top: 100, width: 80, height: 40 };
    expect(magnetOffset(b, 600, 600)).toEqual({ x: 0, y: 0 });
    expect(magnetOffset(b, 160, 120).x).toBeCloseTo(5, 5);
    expect(magnetOffset(b, 200, 120).x).toBe(6);
  });
});

describe('the running section index', () => {
  it('names the last section whose top has passed the reading line', () => {
    expect(currentSection([700, 1500, 2300], 400)).toBe(0);
    expect(currentSection([-300, 500, 1300], 400)).toBe(0);
    expect(currentSection([-900, -100, 800], 400)).toBe(1);
    expect(currentSection([-900, -500, -100], 400)).toBe(2);
    expect(currentSection([], 400)).toBe(0);
  });
});
