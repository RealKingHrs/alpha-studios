// Exports favicon and app icon sizes from the bolder favicon cut. Run: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const svg = await readFile('assets/logo/alpha-mark-favicon.svg');
const png = (size: number) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

await writeFile('public/favicon.svg', svg);
await writeFile('public/favicon.ico', await pngToIco(await Promise.all([16, 32, 48].map(png))));
await writeFile('public/apple-touch-icon.png', await png(180));
await writeFile('public/icon-192.png', await png(192));
await writeFile('public/icon-512.png', await png(512));

// Share image, 1200 x 630: mark centred on midnight.
const mark = await png(360);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0E1A2B' } })
  .composite([{ input: mark, left: 420, top: 135 }])
  .png()
  .toFile('public/og.png');
console.log('icons written to public/');
