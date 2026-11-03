// Writes real HTML for every address into dist/, plus 404.html. Run after `vite build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { BOWL_PATH, BOWL_TRANSFORM, MARK_VIEWBOX, STEM_PATH } from '../src/brand/mark';
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

/** Colours come from the design tokens, so a share image always matches the site. */
const tokens = await readFile('design/tokens.css', 'utf8');
const hex = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1];
const ACCENT_NAMES = ['tomato', 'sun', 'mint', 'sky', 'lilac'] as const;

const markSvg = (
  size: number,
  ink: string,
  gold: string,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${size}" height="${Math.round((size * 156) / 208)}">
<defs><clipPath id="f"><polygon points="140,160 205,108 218,108 218,185 140,185"/></clipPath></defs>
<g transform="${BOWL_TRANSFORM}"><path d="${BOWL_PATH}" fill-rule="evenodd" fill="${ink}"/></g>
<path d="${STEM_PATH}" fill="${ink}"/><path d="${STEM_PATH}" fill="${gold}" clip-path="url(#f)"/></svg>`;

let ogIndex = 0;

/** A 1200 by 630 share image for one address: an accent panel with the mark, then the title and description on paper. */
async function shareImage(path: string, title: string, description: string) {
  const [head] = title.split(' | ');
  const accent = hex(ACCENT_NAMES[ogIndex++ % ACCENT_NAMES.length]);
  const ink = hex('ink');
  const paper = hex('paper');
  const lines = wrap(description, 38, 3);
  const titleLines = wrap(head, 22, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="${paper}"/>
<rect x="0" y="0" width="440" height="630" fill="${accent}"/>
<rect x="440" y="0" width="4" height="630" fill="${ink}"/>
${titleLines.map((l, i) => `<text x="500" y="${215 + i * 74}" fill="${ink}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="66">${xml(l)}</text>`).join('\n')}
${lines.map((l, i) => `<text x="500" y="${215 + titleLines.length * 74 + 24 + i * 40}" fill="${hex('ink-soft')}" font-family="Helvetica, Arial, sans-serif" font-size="29">${xml(l)}</text>`).join('\n')}
<text x="500" y="570" fill="${ink}" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="6">ALPHA STUDIOS</text>
</svg>`;
  const mark = await sharp(Buffer.from(markSvg(300, ink, hex('gold'))))
    .png()
    .toBuffer();
  await mkdir(join(dist, 'og'), { recursive: true });
  await sharp(Buffer.from(svg))
    .composite([{ input: mark, left: 70, top: 215 }])
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
    ...(path.endsWith('/room/')
      ? [
          `<link rel="canonical" href="${siteUrl}${base}${path.replace(/^\//, '').replace(/room\/$/, '')}" />`,
        ]
      : []),
    `<link rel="manifest" href="${base}manifest.webmanifest" />`,
  ].join('\n    ');
  const html = renderToString(
    createElement(App, { snap, pathname: base + path.replace(/^\//, ''), base, search: '' }),
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
