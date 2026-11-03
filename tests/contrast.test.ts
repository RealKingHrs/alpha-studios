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
  const accents = ['gold', 'sand', 'teal', 'slate', 'sage'];

  it('midnight text on ivory and on the ivory tint reaches 7:1', () => {
    for (const bg of ['paper', 'paper-2'])
      expect(ratio(hex('ink'), hex(bg))).toBeGreaterThanOrEqual(7);
  });

  it('secondary text on ivory reaches 4.5:1 on both ivory colours', () => {
    for (const bg of ['paper', 'paper-2'])
      expect(ratio(hex('ink-soft'), hex(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('midnight text on every accent and tint reaches 4.5:1, and secondary text on each reaches 4.5:1', () => {
    for (const a of accents) {
      expect(ratio(hex('ink'), hex(a)), a).toBeGreaterThanOrEqual(7);
      // Gold sets secondary text to full midnight, so only the quiet tints use the softer grey.
      if (a !== 'gold')
        expect(ratio(hex('ink-soft'), hex(a)), `${a} soft`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('deep gold and deep teal text on ivory reach 4.5:1', () => {
    for (const c of ['gold-deep', 'teal-deep'])
      for (const bg of ['paper', 'paper-2'])
        expect(ratio(hex(c), hex(bg)), `${c} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it('on midnight: ivory text reaches 7:1, soft gold and ivory-2 reach 4.5:1', () => {
    expect(ratio(hex('paper'), hex('ink'))).toBeGreaterThanOrEqual(7);
    expect(ratio(hex('gold-soft'), hex('ink'))).toBeGreaterThanOrEqual(7);
    expect(ratio(hex('paper-2'), hex('ink'))).toBeGreaterThanOrEqual(7);
  });

  it('the dark-section secondary text (#B7C0CC) reaches 4.5:1 on midnight and its lifted panel', () => {
    for (const bg of ['ink', 'midnight-2'])
      expect(ratio('#B7C0CC', hex(bg)), bg).toBeGreaterThanOrEqual(4.5);
  });

  it('midnight text on gold buttons reaches 7:1', () => {
    expect(ratio(hex('ink'), hex('gold'))).toBeGreaterThanOrEqual(7);
  });

  it('the midnight focus ring reaches 3:1 on ivory and on every accent; the soft gold ring reaches 3:1 on midnight', () => {
    for (const bg of ['paper', 'paper-2', ...accents])
      expect(ratio(hex('ink'), hex(bg)), bg).toBeGreaterThanOrEqual(3);
    expect(ratio(hex('gold-soft'), hex('ink'))).toBeGreaterThanOrEqual(3);
  });
});
