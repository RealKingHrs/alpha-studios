// Writes real HTML for every address into dist/, plus 404.html. Run after `vite build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { allPaths, matchRoute } from '../src/routes';

const base = process.env.SITE_BASE ?? '/alpha-studios/';
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const dist = 'dist';
const snap = Snapshot.parse(JSON.parse(await readFile(join(dist, 'content.json'), 'utf8')));
const template = await readFile(join(dist, 'index.html'), 'utf8');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function meta(path: string): { title: string; description: string } {
  const route = matchRoute(base + path.replace(/^\//, ''), base, snap);
  const studio = 'Alpha Studios';
  if (route.name === 'project') {
    const p = snap.projects.find((x) => x.slug === route.slug)!;
    return { title: `${p.name} | ${studio}`, description: p.summary };
  }
  if (route.name === 'member') {
    const m = snap.members.find((x) => x.slug === route.slug)!;
    return { title: `${m.name}, ${m.role} | ${studio}`, description: m.bio };
  }
  if (route.name === 'portal')
    return { title: `Crew portal | ${studio}`, description: 'Sign in for crew and admin.' };
  if (route.name === 'not-found')
    return { title: `Page not found | ${studio}`, description: 'This address does not exist.' };
  return { title: studio, description: snap.settings.studioStatement };
}

function page(path: string): string {
  const { title, description } = meta(path);
  const image = `${siteUrl}${base}og.png`;
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
  ].join('\n    ');
  const html = renderToString(App({ snap, pathname: base + path.replace(/^\//, ''), base }));
  return template.replace('<!--head-->', head).replace('<!--app-->', html);
}

for (const path of allPaths(snap)) {
  const file = join(dist, path === '/' ? 'index.html' : join(path, 'index.html'));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(path));
}
await writeFile(join(dist, '404.html'), page('/__not-found__'));
console.log(`prerendered ${allPaths(snap).length} pages plus 404.html`);
