import { safeGet, safeSet } from './util/storage';

export type Theme = 'dark' | 'light';
export const THEME_KEY = 'alpha:theme';

/** A saved choice wins; with none, the site is dark. */
export const resolveTheme = (saved: string | null): Theme => (saved === 'light' ? 'light' : 'dark');

/**
 * Runs in the page head before first paint, so a saved light choice never flashes dark.
 * Kept as a string so the same text goes into both HTML shells and the test can run it.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.dataset.theme='light';}catch(e){}`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Applies a theme, remembers it in this browser, and updates the browser chrome colour. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  safeSet(THEME_KEY, theme);
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

export const savedTheme = () => resolveTheme(safeGet(THEME_KEY));
