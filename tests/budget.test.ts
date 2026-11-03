import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { corridorBudget } from '../scripts/sizes';

// Run `npm run build` first. The spec's target: under 3 MB downloaded before the corridor appears.
const built = existsSync('dist/.vite/manifest.json');
const d = built ? describe : describe.skip;

d('download budget', () => {
  const b = corridorBudget();

  it('stays under 3 MB (gzip) before the corridor appears', () => {
    expect(b.total).toBeLessThan(3 * 1024 * 1024);
  });

  it('keeps rooms, sound and the dev panel out of the first visit', () => {
    const names = b.parts.map((p) => p.name).join(' ');
    expect(names).not.toMatch(/room|sound|dev/i);
    for (const l of b.lazy) expect(l.bytes, l.name).toBeGreaterThan(0);
  });
});
