export interface Tokens {
  obsidian: string;
  graphite: string;
  line: string;
  chrome: string;
  silver: string;
  gold: string;
  emerald: string;
  emeraldGlow: string;
  /** --dur-slow in seconds. */
  durSlow: number;
  /** --ease as a cubic-bezier. */
  ease: string;
}

/** The scene takes every colour and duration from design/tokens.css at run time (rule 7). */
export function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    obsidian: v('--obsidian'),
    graphite: v('--graphite'),
    line: v('--line'),
    chrome: v('--chrome'),
    silver: v('--silver'),
    gold: v('--gold'),
    emerald: v('--emerald'),
    emeraldGlow: v('--emerald-glow'),
    durSlow: (parseFloat(v('--dur-slow')) || 720) / 1000,
    ease: v('--ease'),
  };
}
