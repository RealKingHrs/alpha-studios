import { beatOf, matchRoute, type Route } from '../routes';
import type { Snapshot } from '../content/schema';

export type Cue = 'tick' | 'chime';

/** Which sound, if any, goes with moving from one address to another. */
export function cueForMove(prev: Route, next: Route): Cue | null {
  if (prev.name === next.name && 'slug' in prev && 'slug' in next && prev.slug === next.slug)
    return null;
  if (next.name === 'room' && prev.name !== 'room') return 'chime';
  if (prev.name === next.name && !('slug' in next)) return null;
  return beatOf(prev) !== beatOf(next) || prev.name !== next.name ? 'tick' : null;
}

export const cueLabel: Record<Cue, string> = { tick: 'Soft tick', chime: 'Chime: room opened' };

export function routeFor(pathname: string, base: string, snap: Snapshot): Route {
  return matchRoute(pathname, base, snap);
}
