import type { Member, Project, Snapshot } from '../content/schema';
import { platformLabel } from '../rooms';

export const ACCENTS = ['tomato', 'sun', 'mint', 'sky', 'lilac'] as const;
export type Accent = (typeof ACCENTS)[number];

/** Each project, and each person, keeps the same accent colour wherever it appears. */
export const accentFor = (index: number): Accent =>
  ACCENTS[((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];

/** The headline. Direct, and true of what the studio does. The second part sits on an orange block. */
export const HEADLINE = ['We build software', 'people rely on.'] as const;

export const headlineText = () => HEADLINE.join(' ');

/** Up to two capital letters for a name: "Ada Lovelace" is AL, "Member three" is MT. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters =
    words.length === 1 ? [...words[0]].slice(0, 2) : [words[0][0], words[words.length - 1][0]];
  return letters.join('').toUpperCase();
}

/** The scrolling band: platforms and technologies from the projects, each once, in order of appearance. */
export function marqueeItems(snap: Pick<Snapshot, 'projects'>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };
  for (const p of snap.projects) p.platforms.forEach((x) => add(platformLabel[x]));
  for (const p of snap.projects) p.tech.forEach(add);
  return out;
}

/** Language shares for the bar on a case study, largest first, as whole-number percentages that add up to 100. */
export function languageShares(
  languages: Record<string, number>,
): Array<{ name: string; percent: number }> {
  const entries = Object.entries(languages)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((n, [, v]) => n + v, 0);
  if (total === 0) return [];
  const raw = entries.map(([name, v]) => ({ name, exact: (v / total) * 100 }));
  const out = raw.map((r) => ({ name: r.name, percent: Math.floor(r.exact), frac: r.exact % 1 }));
  let left = 100 - out.reduce((n, r) => n + r.percent, 0);
  for (const r of [...out].sort((a, b) => b.frac - a.frac)) {
    if (left <= 0) break;
    r.percent += 1;
    left -= 1;
  }
  return out.map(({ name, percent }) => ({ name, percent }));
}

/** Pick which screenshots to stack in a panel: one large (Mac or browser) first, then phones. */
export function stackOrder(shots: Project['screenshots']): Project['screenshots'] {
  const rank = (d: string) => (d === 'mac' || d === 'browser' ? 0 : 1);
  return [...shots].sort((a, b) => rank(a.device) - rank(b.device)).slice(0, 3);
}

export const memberAccent = (members: Member[], slug: string): Accent =>
  accentFor(members.findIndex((m) => m.slug === slug));
