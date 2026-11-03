import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteBudget } from '../scripts/sizes';

// Run `npm run build` first. The spec's target is under 3 MB before the page appears; this site holds itself to far less.
const built = existsSync('dist/.vite/manifest.json');
const d = built ? describe : describe.skip;

d('download budget', () => {
  const b = siteBudget();

  it('keeps the first visit under 3 MB (gzip), as the spec requires', () => {
    expect(b.total).toBeLessThan(3 * 1024 * 1024);
  });

  it('keeps it under 500 kB (gzip), so an extra library or font does not slip in unnoticed', () => {
    expect(b.total).toBeLessThan(500 * 1024);
  });

  it('ships no 3D code and no backend client in the public site', () => {
    for (const f of b.siteFiles.filter((x) => x.endsWith('.js'))) {
      const text = readFileSync(join('dist', f), 'utf8');
      expect(text, f).not.toContain('WebGLRenderer');
      expect(text.toLowerCase(), f).not.toContain('supabase');
    }
  });
});
