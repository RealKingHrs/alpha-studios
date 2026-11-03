// Writes real HTML for every address into dist/, plus 404.html. Run after `vite build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { pageMeta } from '../src/meta';
import { allPaths } from '../src/routes';

const base = process.env.SITE_BASE ?? '/alpha-studios/';
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const dist = 'dist';
const snap = Snapshot.parse(JSON.parse(await readFile(join(dist, 'content.json'), 'utf8')));
const template = await readFile(join(dist, 'index.html'), 'utf8');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Words wrapped to lines of at most `width` characters, up to `max` lines. */
function wrap(text: string, width: number, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + w).trim().length > width && line) {
      lines.push(line);
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines
    .slice(0, max)
    .map((l, i) => (i === max - 1 && lines.length > max ? `${l.replace(/[ ,.]+$/, '')}...` : l));
}

const ogKey = (path: string) =>
  path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-');

/** A 1200 by 630 share image for one address: the mark, its title and the first lines of its description. */
async function shareImage(path: string, title: string, description: string) {
  const [head] = title.split(' | ');
  const mark = await sharp(await readFile('public/icon-512.png'))
    .resize(240, 240)
    .toBuffer();
  const lines = wrap(description, 46, 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<text x="400" y="250" fill="#E9ECEF" font-family="Helvetica, Arial, sans-serif" font-size="60">${xml(head)}</text>
${lines.map((l, i) => `<text x="400" y="${320 + i * 44}" fill="#A9AFB6" font-family="Helvetica, Arial, sans-serif" font-size="30">${xml(l)}</text>`).join('\n')}
<text x="400" y="560" fill="#A9AFB6" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="6">ALPHA STUDIOS</text>
</svg>`;
  await mkdir(join(dist, 'og'), { recursive: true });
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0B0C0D' } })
    .composite([
      { input: mark, left: 100, top: 195 },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(dist, 'og', `${ogKey(path)}.png`));
}

function page(path: string): string {
  const { title, description } = pageMeta(base + path.replace(/^\//, ''), base, snap);
  const image = `${siteUrl}${base}og/${ogKey(path)}.png`;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="theme-color" content="#0B0C0D" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="icon" href="${base}favicon.ico" sizes="48x48" />`,
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />`,
    `<link rel="manifest" href="${base}manifest.webmanifest" />`,
  ].join('\n    ');
  const html = renderToString(
    createElement(App, { snap, pathname: base + path.replace(/^\//, ''), base }),
  );
  return template.replace('<!--head-->', head).replace('<!--app-->', html);
}

for (const path of allPaths(snap)) {
  const m = pageMeta(base + path.replace(/^\//, ''), base, snap);
  await shareImage(path, m.title, m.description);
  const file = join(dist, path === '/' ? 'index.html' : join(path, 'index.html'));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(path));
}
{
  const m = pageMeta(base + '__not-found__', base, snap);
  await shareImage('/__not-found__', m.title, m.description);
}
await writeFile(join(dist, '404.html'), page('/__not-found__'));
console.log(`prerendered ${allPaths(snap).length} pages plus 404.html`);
