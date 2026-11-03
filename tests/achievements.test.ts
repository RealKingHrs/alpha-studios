import { describe, expect, it } from 'vitest';
import { elementsOf } from '../src/site/Elements';
import {
  ACHIEVEMENTS,
  TOTAL_XP,
  award,
  levelOf,
  parseEarned,
  xpOf,
} from '../src/site/motion/achievements';
import { parseSkills } from '../src/portal/screens/Profile';
import type { Snapshot } from '../src/content/schema';

describe('achievements', () => {
  it('awards once and ignores unknown or repeated ids', () => {
    const first = award([], 'first-look');
    expect(first).toEqual({ earned: ['first-look'], isNew: true });
    expect(award(first.earned, 'first-look').isNew).toBe(false);
    expect(award([], 'not-real').isNew).toBe(false);
  });

  it('adds up XP and levels', () => {
    expect(xpOf([])).toBe(0);
    expect(xpOf(ACHIEVEMENTS.map((a) => a.id))).toBe(TOTAL_XP);
    expect(levelOf(0)).toBe(1);
    expect(levelOf(300)).toBe(2);
  });

  it('reads damaged storage as empty and drops unknown ids', () => {
    expect(parseEarned('{oops')).toEqual([]);
    expect(parseEarned('"text"')).toEqual([]);
    expect(parseEarned(null)).toEqual([]);
    expect(parseEarned('["first-look","bogus",3]')).toEqual(['first-look']);
  });
});

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

describe('profile skills text', () => {
  it('parses names and levels, clamps levels and drops blanks', () => {
    expect(parseSkills('React:5, Swift:9, ,Rust')).toEqual([
      { name: 'React', level: 5 },
      { name: 'Swift', level: 5 },
      { name: 'Rust', level: 3 },
    ]);
    expect(parseSkills('X:0')).toEqual([{ name: 'X', level: 3 }]);
  });
});
