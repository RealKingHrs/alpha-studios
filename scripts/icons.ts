// Exports the favicon and app icons from the wordmark's "a." cut (assets/logo/alpha-a-icon.png, drawn in
// Fraunces italic 800 with the gold full stop). Run: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const src = await readFile('assets/logo/alpha-a-icon.png');
const png = (size: number) => sharp(src).resize(size, size).png().toBuffer();

// The SVG favicon carries a small PNG of the same cut, so it looks identical everywhere.
const small = (await png(128)).toString('base64');
await writeFile(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${small}"/></svg>\n`,
);
await writeFile('public/favicon.ico', await pngToIco(await Promise.all([16, 32, 48].map(png))));
await writeFile('public/apple-touch-icon.png', await png(180));
await writeFile('public/icon-192.png', await png(192));
await writeFile('public/icon-512.png', await png(512));

// Default share image, 1200 x 630: the "a." on paper.
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f6f1e7' } })
  .composite([{ input: await png(360), left: 420, top: 135 }])
  .png()
  .toFile('public/og.png');
console.log('icons written to public/');
