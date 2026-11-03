import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteBudget } from '../scripts/sizes';

// Run `npm run build` first. The spec's target: under 3 MB downloaded before the page appears.
const built = existsSync('dist/.vite/manifest.json');
const d = built ? describe : describe.skip;

d('download budget', () => {
  const b = siteBudget();

  it('keeps the first visit to the bright site under 3 MB (gzip)', () => {
    expect(b.total).toBeLessThan(3 * 1024 * 1024);
  });

  it('does not put any 3D code in the first visit', () => {
    for (const f of b.siteFiles.filter((x) => x.endsWith('.js'))) {
      const text = readFileSync(join('dist', f), 'utf8');
      expect(text, f).not.toContain('WebGLRenderer');
    }
  });

  it('keeps Explore, avatars, rooms and sound as separate downloads', () => {
    expect(b.explore).toBeGreaterThan(100 * 1024);
    for (const l of b.lazy) expect(l.bytes, l.name).toBeGreaterThan(0);
    const names = b.parts.map((p) => p.name).join(' ');
    expect(names).not.toMatch(/3D|room|sound/i);
  });
});
