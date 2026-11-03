import type { Route } from './routes';
import type { Stop } from './vault/layout';

export interface StepLinks {
  back: { path: string; label: string } | null;
  forward: { path: string; label: string } | null;
}

const labels: Record<string, string> = {
  entrance: 'the entrance',
  projects: 'the project hall',
  crew: 'the crew gallery',
  contact: 'the contact alcove',
  portal: 'the crew door',
};
const label = (s: Stop) => labels[s.id] ?? `the ${s.id.replace(/-/g, ' ')} pedestal`;

/** Where Back and Forward lead from an address. Inside a room, Back returns to its pedestal. */
export function stepLinks(route: Route, stops: Stop[]): StepLinks {
  if (route.name === 'room') {
    const s = stops.find((x) => x.id === route.slug);
    return { back: s ? { path: s.path, label: 'the pedestal' } : null, forward: null };
  }
  const path =
    route.name === 'home'
      ? '/'
      : route.name === 'projects'
        ? '/projects/'
        : route.name === 'project'
          ? `/projects/${route.slug}/`
          : route.name === 'crew' || route.name === 'member'
            ? '/crew/'
            : route.name === 'contact'
              ? '/contact/'
              : route.name === 'portal'
                ? '/portal/'
                : null;
  const i = stops.findIndex((s) => s.path === path);
  if (i < 0) return { back: null, forward: null };
  const pick = (s: Stop | undefined) => (s ? { path: s.path, label: label(s) } : null);
  return { back: pick(stops[i - 1]), forward: pick(stops[i + 1]) };
}
