/** Storage can throw (private windows, blocked site data), so every access is wrapped. */
export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the page works without it */
  }
}

const INTRO_KEY = 'alpha:intro-seen';
export const hasSeenIntro = () => safeGet(INTRO_KEY) === '1';
export const markIntroSeen = () => safeSet(INTRO_KEY, '1');
