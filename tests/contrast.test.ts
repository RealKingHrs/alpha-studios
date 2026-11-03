import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('design/tokens.css', 'utf8');
const hex = (name: string) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};

/** WCAG relative luminance and contrast ratio. */
const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('colour contrast of the design tokens', () => {
  // Every pairing the interface uses for text, on both surfaces text sits on.
  const text = ['chrome', 'silver', 'emerald-glow'];
  const surfaces = ['obsidian', 'graphite'];
  for (const t of text) {
    for (const s of surfaces) {
      it(`${t} text on ${s} reaches 4.5:1`, () => {
        expect(ratio(hex(t), hex(s))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('emerald, used for controls and borders, reaches 3:1 on both surfaces', () => {
    for (const s of surfaces) expect(ratio(hex('emerald'), hex(s))).toBeGreaterThanOrEqual(3);
  });

  it('the gold focus ring reaches 3:1 on both surfaces, as a non-text indicator needs', () => {
    for (const s of surfaces) expect(ratio(hex('gold'), hex(s))).toBeGreaterThanOrEqual(3);
  });

  it('matches the contrast figures the spec quotes for obsidian', () => {
    const quoted: Record<string, number> = {
      chrome: 16.5,
      silver: 8.9,
      gold: 8.2,
      emerald: 5.7,
      'emerald-glow': 11.1,
    };
    for (const [name, want] of Object.entries(quoted)) {
      expect(ratio(hex(name), hex('obsidian')), name).toBeCloseTo(want, 0);
    }
  });
});
