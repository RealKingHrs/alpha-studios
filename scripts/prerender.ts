// Writes real HTML for every address into dist/, plus 404.html. Run after `vite build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { MARK_GRADIENT, MARK_PATH, MARK_VIEWBOX, MARK_WIDTH } from '../src/brand/mark';
import { pageMeta } from '../src/meta';
import { allPaths } from '../src/routes';

const base = process.env.SITE_BASE ?? '/alpha-studios/';
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const dist = process.env.DIST ?? 'dist';
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

/** Colours come from the design tokens, so a share image always matches the site. */
const tokens = await readFile('design/tokens.css', 'utf8');
const hex = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1];
const ACCENT_NAMES = ['tomato', 'sun', 'mint', 'sky', 'lilac'] as const;
let ogIndex = 0;

const markSvg = (
  size: number,
  ink: string,
  gold: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${size}" height="${Math.round((size * 98) / 108)}">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${MARK_GRADIENT.x1}" y1="${MARK_GRADIENT.y1}" x2="${MARK_GRADIENT.x2}" y2="${MARK_GRADIENT.y2}"><stop offset="${MARK_GRADIENT.at}" stop-color="${ink}"/><stop offset="${MARK_GRADIENT.at}" stop-color="${gold}"/></linearGradient></defs>
<path d="${MARK_PATH}" fill="none" stroke="url(#g)" stroke-width="${MARK_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** A 1200 by 630 share image for one address: an accent panel with the mark, then the title and description on paper. */
async function shareImage(path: string, title: string, description: string) {
  const [head] = title.split(' | ');
  const accent = hex(ACCENT_NAMES[ogIndex++ % ACCENT_NAMES.length]);
  const ink = hex('ink');
  const paper = hex('paper');
  const lines = wrap(description, 60, 2);
  const titleLines = wrap(head, 28, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<defs>
<radialGradient id="ga" cx="18%" cy="10%" r="60%"><stop offset="0" stop-color="${hex('tomato')}" stop-opacity="0.55"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
<radialGradient id="gb" cx="88%" cy="0%" r="55%"><stop offset="0" stop-color="${hex('lilac')}" stop-opacity="0.5"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
<radialGradient id="gc" cx="60%" cy="110%" r="60%"><stop offset="0" stop-color="${accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
<linearGradient id="gt" x1="0" x2="1"><stop offset="0" stop-color="${hex('sun')}"/><stop offset="0.5" stop-color="${hex('tomato')}"/><stop offset="1" stop-color="${hex('lilac')}"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="${paper}"/>
<rect width="1200" height="630" fill="url(#ga)"/>
<rect width="1200" height="630" fill="url(#gb)"/>
<rect width="1200" height="630" fill="url(#gc)"/>
<rect x="72" y="72" width="132" height="120" rx="28" fill="${hex('surface-2')}" stroke="${hex('surface-3')}"/>
${titleLines.map((l, i) => `<text x="72" y="${300 + i * 70}" fill="${ink}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="62">${xml(l)}</text>`).join('\n')}
${lines.map((l, i) => `<text x="72" y="${300 + titleLines.length * 70 + 16 + i * 38}" fill="${hex('ink-soft')}" font-family="Helvetica, Arial, sans-serif" font-size="28">${xml(l)}</text>`).join('\n')}
<rect x="72" y="560" width="220" height="3" rx="1.5" fill="url(#gt)"/>
<text x="1128" y="570" text-anchor="end" fill="${hex('ink-soft')}" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="6">ALPHA STUDIOS</text>
</svg>`;
  const mark = await sharp(Buffer.from(markSvg(96, ink, hex('gold'))))
    .png()
    .toBuffer();
  await mkdir(join(dist, 'og'), { recursive: true });
  await sharp(Buffer.from(svg))
    .composite([{ input: mark, left: 90, top: 89 }])
    .png({ compressionLevel: 9 })
    .toFile(join(dist, 'og', `${ogKey(path)}.png`));
}

function page(path: string): string {
  const { title, description } = pageMeta(base + path.replace(/^\//, ''), base, snap);
  const image = `${siteUrl}${base}og/${ogKey(path)}.png`;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="theme-color" content="${hex('paper')}" />`,
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
