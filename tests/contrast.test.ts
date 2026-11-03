import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('design/tokens.css', 'utf8');
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`block ${selector} not found`);
  return css.slice(start, css.indexOf('\n}', start));
};
const light = block(':root');

/** A token's hex value in the one theme. */
const hex = (theme: string, name: string) => {
  const re = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`);
  const m = re.exec(theme);
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

const accents = ['tomato', 'sun', 'mint', 'sky', 'lilac'];
const surfaces = ['bg', 'surface-1', 'surface-2', 'surface-3'];

describe.each([['light', light]])('colour contrast in the %s theme', (_name, theme) => {
  it('body text reaches 7:1 on the ground and every surface', () => {
    for (const s of surfaces)
      expect(ratio(hex(theme, 'text'), hex(theme, s)), s).toBeGreaterThanOrEqual(7);
  });

  it('secondary text reaches 4.5:1 on the ground and every surface', () => {
    for (const s of surfaces)
      expect(ratio(hex(theme, 'text-soft'), hex(theme, s)), s).toBeGreaterThanOrEqual(4.5);
  });

  it('faint labels reach 4.5:1 on the ground and the first surface', () => {
    for (const s of ['bg', 'surface-1'])
      expect(ratio(hex(theme, 'text-faint'), hex(theme, s)), s).toBeGreaterThanOrEqual(4.5);
  });

  it('the focus ring reaches 3:1 on the ground and every surface', () => {
    for (const s of surfaces)
      expect(ratio(hex(theme, 'focus-color'), hex(theme, s)), s).toBeGreaterThanOrEqual(3);
  });
});

describe('the accents', () => {
  it('carry their on-accent text at 4.5:1 or better', () => {
    for (const a of accents)
      expect(ratio(hex(light, 'on-accent'), hex(light, a)), a).toBeGreaterThanOrEqual(4.5);
  });
});
