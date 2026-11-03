import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// These run against dist/, so run `npm run build` first.
const built = existsSync('dist/index.html');
const d = built ? describe : describe.skip;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

d('built site', () => {
  const routes = [
    'index.html',
    '404.html',
    'projects/index.html',
    'crew/index.html',
    'contact/index.html',
    'portal/index.html',
    'projects/project-one/index.html',
    'projects/project-one/room/index.html',
    'projects/project-two/room/index.html',
    'crew/member-one/index.html',
  ];

  it.each(routes)('%s serves readable HTML with title and share image', (r) => {
    const html = readFileSync(join('dist', r), 'utf8');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toContain('og:image');
    expect(html).toMatch(/<h1>[^<]+<\/h1>/);
  });

  it('public pages can never load the backend client', () => {
    // Follow the build manifest from the public entry, through static and lazy imports.
    type Entry = { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[] };
    const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')) as Record<
      string,
      Entry
    >;
    const seen = new Set<string>();
    const files = new Set<string>();
    const visit = (key: string) => {
      if (seen.has(key) || !manifest[key]) return;
      seen.add(key);
      const e = manifest[key];
      files.add(e.file);
      e.css?.forEach((c) => files.add(c));
      [...(e.imports ?? []), ...(e.dynamicImports ?? [])].forEach(visit);
    };
    visit('index.html');
    expect(files.size).toBeGreaterThan(3);
    for (const f of files) {
      expect(readFileSync(join('dist', f), 'utf8').toLowerCase(), f).not.toContain('supabase');
    }
    // And no public page's own HTML points at portal code.
    for (const f of walk('dist').filter((x) => x.endsWith('.html') && !x.includes('portal/app'))) {
      expect(readFileSync(f, 'utf8').toLowerCase(), f).not.toContain('supabase');
    }
  });

  it('keeps the backend client inside the portal bundle only', () => {
    type Entry = { file: string; src?: string; isEntry?: boolean };
    const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')) as Record<
      string,
      Entry
    >;
    expect(manifest['portal/app/index.html']).toBeTruthy();
    expect(manifest['index.html'].file).not.toBe(manifest['portal/app/index.html'].file);
  });

  it('ships the favicon sizes', () => {
    for (const f of [
      'favicon.ico',
      'favicon.svg',
      'apple-touch-icon.png',
      'icon-192.png',
      'icon-512.png',
    ])
      expect(existsSync(join('dist', f))).toBe(true);
  });
});
