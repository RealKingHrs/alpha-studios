/** Achievements: things a visitor can find on the site. Pure logic, so it is tested without a browser. */

export interface Achievement {
  id: string;
  title: string;
  /** Shown while locked, and as a nudge. */
  hint: string;
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-look', title: 'First look', hint: 'Arrive at the studio.', xp: 50 },
  { id: 'browsed-work', title: 'Window shopper', hint: 'Open the work page.', xp: 100 },
  { id: 'case-study', title: 'Case closed', hint: 'Read a project case study.', xp: 150 },
  { id: 'meet-crew', title: 'Meet the crew', hint: 'Visit the crew.', xp: 100 },
  { id: 'open-door', title: 'Open door', hint: 'Find the Launchpad.', xp: 150 },
  {
    id: 'elements',
    title: 'Chemistry set',
    hint: 'Poke around the Elements of our stack.',
    xp: 100,
  },
  { id: 'first-contact', title: 'First contact', hint: 'Open the contact page.', xp: 100 },
  { id: 'behind-the-door', title: 'Behind the door', hint: 'Knock on the crew login.', xp: 100 },
  { id: 'scorekeeper', title: 'Scorekeeper', hint: 'Open the XP list in the footer.', xp: 50 },
  {
    id: 'pitch-ready',
    title: 'Pitch ready',
    hint: 'Press the pitch button on the Launchpad.',
    xp: 200,
  },
  { id: 'the-case', title: 'The Case', hint: 'Find the golden briefcase.', xp: 250 },
  {
    id: 'build-mode',
    title: 'Build mode',
    hint: 'Type a certain four-letter word. It rhymes with "field".',
    xp: 250,
  },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Earn an achievement. Returns the new list, and whether it was new. Unknown ids and repeats change nothing. */
export function award(earned: readonly string[], id: string): { earned: string[]; isNew: boolean } {
  if (!byId.has(id) || earned.includes(id)) return { earned: [...earned], isNew: false };
  return { earned: [...earned, id], isNew: true };
}

export const xpOf = (earned: readonly string[]) =>
  earned.reduce((sum, id) => sum + (byId.get(id)?.xp ?? 0), 0);

export const TOTAL_XP = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);

/** Every 300 XP is a level, starting at level 1. */
export const levelOf = (xp: number) => Math.floor(xp / 300) + 1;

/** Reads a stored list defensively: anything that is not a list of known ids is ignored. */
export function parseEarned(raw: string | null): string[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && byId.has(x))
      : [];
  } catch {
    return [];
  }
}
