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
    'crew/member-one/index.html',
  ];

  it.each(routes)('%s serves readable HTML with title and share image', (r) => {
    const html = readFileSync(join('dist', r), 'utf8');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toContain('og:image');
    expect(html).toMatch(/<h1>[^<]+<\/h1>/);
  });

  it('public bundle never references the backend', () => {
    const files = walk('dist').filter((f) => /\.(js|html|css)$/.test(f));
    for (const f of files) expect(readFileSync(f, 'utf8').toLowerCase()).not.toContain('supabase');
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
