import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../src/content/schema';
import { elementsOf } from '../src/site/Elements';

describe('periodic table of the stack', () => {
  const snap = {
    projects: [{ tech: ['Swift', 'Supabase', 'React'] }, { tech: ['React', 'Postgres', 'Swift'] }],
  } as unknown as Snapshot;

  it('numbers tiles, weights by use and keeps symbols unique', () => {
    const tiles = elementsOf(snap);
    expect(
      tiles
        .map((t) => t.name)
        .slice(0, 2)
        .sort(),
    ).toEqual(['React', 'Swift']);
    expect(tiles[0].weight).toBe(2);
    expect(new Set(tiles.map((t) => t.symbol)).size).toBe(tiles.length);
    expect(tiles.map((t) => t.number)).toEqual([1, 2, 3, 4]);
  });
});
