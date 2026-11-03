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

/** A 1200 by 630 share image for one address: an accent panel with the mark, then the title and description on paper. */
async function shareImage(path: string, title: string, description: string) {
  const [head] = title.split(' | ');
  const accent = hex(ACCENT_NAMES[ogIndex++ % ACCENT_NAMES.length]);
  const lines = wrap(description, 42, 3);
  const titleLines = wrap(head, 18, 3);
  const paperFixed = hex('paper-fixed');
  const inkFixed = hex('ink-fixed');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="${paperFixed}"/>
<rect x="0" y="0" width="420" height="630" fill="${accent}"/>
<rect x="420" y="0" width="3" height="630" fill="${inkFixed}"/>
<rect x="0" y="0" width="1200" height="630" fill="none" stroke="${inkFixed}" stroke-width="6"/>
<text x="480" y="104" fill="${inkFixed}" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="5">ISSUE 01 · ALPHA STUDIOS</text>
<rect x="480" y="128" width="660" height="3" fill="${inkFixed}"/>
${titleLines.map((l, i) => `<text x="480" y="${232 + i * 74}" fill="${inkFixed}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="68">${xml(l)}</text>`).join('\n')}
${lines.map((l, i) => `<text x="480" y="${232 + titleLines.length * 74 + 10 + i * 38}" fill="#4a443d" font-family="Helvetica, Arial, sans-serif" font-size="27">${xml(l)}</text>`).join('\n')}
</svg>`;
  const mark = await sharp('assets/logo/alpha-a-icon.png').resize(260, 260).png().toBuffer();
  await mkdir(join(dist, 'og'), { recursive: true });
  await sharp(Buffer.from(svg))
    .composite([{ input: mark, left: 80, top: 185 }])
    .png({ compressionLevel: 9 })
    .toFile(join(dist, 'og', `${ogKey(path)}.png`));
}

/** The public address of one page, with a trailing slash like the files on disk. */
const canonical = (path: string) =>
  `${siteUrl}${base}${path === '/' ? '' : path.replace(/^\//, '').replace(/\/?$/, '/')}`;

/** What search engines read to learn who we are: an organisation and a website, with the people as members. */
function structuredData() {
  const home = canonical('/');
  // The studio's GitHub account, known to the publish workflow, ties the site to its code for search engines.
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const same = owner ? [`https://github.com/${owner}`] : [];
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#studio`,
        name: 'Alpha Studios',
        alternateName: ['Alpha Studios crew', 'alpha.'],
        url: home,
        logo: `${siteUrl}${base}icon-512.png`,
        description: snap.settings.studioStatement,
        ...(snap.settings.contactEmail ? { email: snap.settings.contactEmail } : {}),
        ...(same.length ? { sameAs: same } : {}),
        member: snap.members.map((m) => ({
          '@type': 'Person',
          name: m.name,
          jobTitle: m.role,
          url: canonical(`/crew/${m.slug}/`),
        })),
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#site`,
        url: home,
        name: 'Alpha Studios',
        publisher: { '@id': `${home}#studio` },
      },
    ],
  }).replace(/</g, '\\u003c');
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
    ...(siteUrl ? [`<link rel="canonical" href="${esc(canonical(path))}" />`] : []),
    `<meta property="og:site_name" content="Alpha Studios" />`,
    `<meta property="og:type" content="${path === '/' ? 'website' : 'article'}" />`,
    ...(siteUrl ? [`<meta property="og:url" content="${esc(canonical(path))}" />`] : []),
    ...(path === '/' ? [`<script type="application/ld+json">${structuredData()}</script>`] : []),
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
// Search engines: a sitemap of every address and a robots file that points to it. The portal is kept out of search.
if (siteUrl) {
  const urls = allPaths(snap)
    .filter((p) => !p.startsWith('/portal'))
    .map((p) => `  <url><loc>${esc(canonical(p))}</loc></url>`);
  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
  await writeFile(
    join(dist, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: ${base}portal/\n\nSitemap: ${siteUrl}${base}sitemap.xml\n`,
  );
}
console.log(`prerendered ${allPaths(snap).length} pages plus 404.html`);
