import { safeGet, safeSet } from './util/storage';

export type Theme = 'dark' | 'light';
export const THEME_KEY = 'alpha:theme';

/** A saved choice wins; with none, the site is light paper. */
export const resolveTheme = (saved: string | null): Theme => (saved === 'dark' ? 'dark' : 'light');

/**
 * Runs in the page head before first paint, so a saved dark choice never flashes light.
 * Kept as a string so the same text goes into both HTML shells and the test can run it.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Applies a theme, remembers it in this browser, and updates the browser chrome colour. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  safeSet(THEME_KEY, theme);
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

export const savedTheme = () => resolveTheme(safeGet(THEME_KEY));
