import { describe, expect, it } from 'vitest';
import { canStack, driftPercent, marqueeBase, stickyTopFor } from '../src/site/motion/viewport';

describe('viewport logic', () => {
  it('keeps the sticky offset between 76 and 108', () => {
    expect(stickyTopFor(400)).toBe(76);
    expect(stickyTopFor(900)).toBe(90);
    expect(stickyTopFor(2000)).toBe(108);
  });

  it('stacks only when every panel fits and the screen is wide enough', () => {
    expect(canStack([520, 520], 900, 1440)).toBe(true);
    expect(canStack([520, 520], 600, 1440)).toBe(false);
    expect(canStack([520, 520], 900, 800)).toBe(false);
    expect(canStack([520], 900, 1440)).toBe(false);
  });

  it('scales marquee speed with width within bounds', () => {
    expect(marqueeBase(1440)).toBe(46);
    expect(marqueeBase(300)).toBe(28);
    expect(marqueeBase(5000)).toBe(74);
  });

  it('expresses drift in percent', () => {
    expect(driftPercent(1)).toBe('9.0%');
    expect(driftPercent(-0.5)).toBe('-4.5%');
  });
});
