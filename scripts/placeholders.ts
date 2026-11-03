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

for (const p of snap.projects) {
  for (const s of p.screenshots) {
    const [w, h] = sizes[s.device];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#16181B"/>
<rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="16" fill="none" stroke="#26292D" stroke-width="2"/>
<text x="${w / 2}" y="${h / 2 - 16}" fill="#E9ECEF" font-family="Helvetica, Arial, sans-serif" font-size="${w > 500 ? 36 : 26}" text-anchor="middle">${p.name}</text>
<text x="${w / 2}" y="${h / 2 + 28}" fill="#A9AFB6" font-family="Helvetica, Arial, sans-serif" font-size="${w > 500 ? 22 : 18}" text-anchor="middle">Placeholder ${s.device} screenshot</text>
</svg>`;
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/${s.src}`);
  }
}
console.log('placeholder screenshots written to public/screens/');
