// Generates the placeholder screenshots the project rooms show until real ones exist. Run: npm run placeholders
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { Snapshot } from '../src/content/schema';
import { readFileSync } from 'node:fs';

const sizes = {
  iphone: [390, 844],
  android: [390, 844],
  mac: [960, 600],
  browser: [960, 600],
} as const;
const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
await mkdir('public/screens', { recursive: true });

const tokens = readFileSync('design/tokens.css', 'utf8');
const hex = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1];
const ACCENTS = ['tomato', 'sun', 'mint', 'sky', 'lilac'].map(hex);

for (const [pi, p] of snap.projects.entries()) {
  for (const [si, s] of p.screenshots.entries()) {
    const [w, h] = sizes[s.device];
    const a = ACCENTS[(pi + si + 1) % ACCENTS.length];
    const b = ACCENTS[(pi + si + 3) % ACCENTS.length];
    const big = w > 500;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${hex('paper')}"/>
<circle cx="${w * 0.78}" cy="${h * 0.24}" r="${Math.min(w, h) * 0.22}" fill="${a}" stroke="${hex('ink')}" stroke-width="3"/>
<rect x="${w * 0.08}" y="${h * 0.66}" width="${w * 0.5}" height="${h * 0.14}" rx="${h * 0.07}" fill="${b}" stroke="${hex('ink')}" stroke-width="3"/>
<rect x="${w * 0.08}" y="${h * 0.12}" width="${w * 0.34}" height="${h * 0.045}" rx="${h * 0.02}" fill="${hex('ink')}"/>
<text x="${w * 0.08}" y="${h * 0.5}" fill="${hex('ink')}" font-family="Georgia, serif" font-weight="bold" font-size="${big ? 54 : 40}">${p.name}</text>
<text x="${w * 0.08}" y="${h * 0.58}" fill="${hex('ink-soft')}" font-family="Helvetica, Arial, sans-serif" font-size="${big ? 22 : 17}">Sample ${s.device} screen</text>
</svg>`;
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/${s.src}`);
  }
}
console.log('placeholder screenshots written to public/screens/');
