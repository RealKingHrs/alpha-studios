import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_KEY, THEME_SCRIPT, resolveTheme } from '../src/theme';

/** Runs the head script against a stand-in document and storage. */
function runHead(saved: string | null, throws = false) {
  const root = { dataset: {} as Record<string, string> };
  const localStorage = {
    getItem: (k: string) => {
      if (throws) throw new Error('blocked');
      return k === THEME_KEY ? saved : null;
    },
  };
  new Function('document', 'localStorage', THEME_SCRIPT)({ documentElement: root }, localStorage);
  return root.dataset.theme;
}

describe('theme', () => {
  it('is dark unless light was chosen', () => {
    expect(resolveTheme(null)).toBe('dark');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('purple')).toBe('dark');
  });

  it('the head script applies a saved light choice before paint and survives blocked storage', () => {
    expect(runHead('light')).toBe('light');
    expect(runHead('dark')).toBeUndefined();
    expect(runHead(null)).toBeUndefined();
    expect(runHead(null, true)).toBeUndefined();
  });

  it('both HTML shells carry the head script, so neither flashes the wrong theme', () => {
    for (const f of ['index.html', 'portal/app/index.html'])
      expect(readFileSync(f, 'utf8'), f).toContain(THEME_SCRIPT);
  });
});
