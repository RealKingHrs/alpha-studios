// Turns the lockup's ALPHA and STUDIOS text into outlines from the self-hosted Inter files, so the
// logo no longer depends on a font being installed. Run: npm run wordmark
import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const load = (weight: 400 | 500) => {
  const buf = readFileSync(
    `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff`,
  );
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

/** Outline a line of text, spacing letters like SVG's letter-spacing does. */
function outline(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  size: number,
  spacing: number,
) {
  let cx = x;
  let d = '';
  for (const ch of text) {
    d += font.getPath(ch, cx, y, size).toPathData(2);
    cx += font.getAdvanceWidth(ch, size) + spacing;
  }
  return d;
}

const src = readFileSync('assets/logo/alpha-lockup.svg', 'utf8');
const alpha = outline(load(500), 'ALPHA', 168, 86, 44, 9);
const studios = outline(load(400), 'STUDIOS', 171, 118, 16, 13);

const out = src
  .replace(/<text[^>]*>ALPHA<\/text>/, `<path fill="#E9ECEF" d="${alpha}"/>`)
  .replace(/<text[^>]*>STUDIOS<\/text>/, `<path fill="#A9AFB6" d="${studios}"/>`);
if (/<text/.test(out)) throw new Error('A text element is left in the lockup');
writeFileSync('assets/logo/alpha-lockup-outlined.svg', out);
console.log('wrote assets/logo/alpha-lockup-outlined.svg');
