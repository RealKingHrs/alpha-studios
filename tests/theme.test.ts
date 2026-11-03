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
  it('is light paper unless dark was chosen', () => {
    expect(resolveTheme(null)).toBe('light');
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('purple')).toBe('light');
  });

  it('the head script applies a saved dark choice before paint and survives blocked storage', () => {
    expect(runHead('dark')).toBe('dark');
    expect(runHead('light')).toBeUndefined();
    expect(runHead(null)).toBeUndefined();
    expect(runHead(null, true)).toBeUndefined();
  });

  it('both HTML shells carry the head script, so neither flashes the wrong theme', () => {
    // Formatting may spread the script over lines, so compare without whitespace.
    const squash = (t: string) => t.replace(/\s+/g, '');
    for (const f of ['index.html', 'portal/app/index.html'])
      expect(squash(readFileSync(f, 'utf8')), f).toContain(squash(THEME_SCRIPT));
  });
});
