import type { Snapshot } from './content/schema';

export type Beat = 'entrance' | 'projects' | 'crew' | 'contact' | 'portal';

/** The five beats of the journey, in order. Each is an address and a place in the vault. */
export const BEATS: ReadonlyArray<{ id: Beat; path: string; label: string }> = [
  { id: 'entrance', path: '/', label: 'Entrance' },
  { id: 'projects', path: '/projects/', label: 'Project hall' },
  { id: 'crew', path: '/crew/', label: 'Crew gallery' },
  { id: 'contact', path: '/contact/', label: 'Contact' },
  { id: 'portal', path: '/portal/', label: 'Crew door' },
];

export type Route =
  | { name: 'home' }
  | { name: 'projects' }
  | { name: 'crew' }
  | { name: 'contact' }
  | { name: 'project'; slug: string }
  | { name: 'room'; slug: string }
  | { name: 'member'; slug: string }
  | { name: 'portal' }
  | { name: 'not-found' };

/** Strip the deploy base and trailing slash, then match a path to a route. */
export function matchRoute(pathname: string, base: string, snap: Snapshot): Route {
  let p = pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname;
  p = p.replace(/\/+$/, '') || '/';
  if (p === '/') return { name: 'home' };
  if (p === '/portal') return { name: 'portal' };
  if (p === '/projects') return { name: 'projects' };
  if (p === '/crew') return { name: 'crew' };
  if (p === '/contact') return { name: 'contact' };
  const [, kind, slug, extra] = p.split('/');
  if (extra === undefined && kind === 'projects' && snap.projects.some((x) => x.slug === slug))
    return { name: 'project', slug };
  if (
    extra === 'room' &&
    p.split('/').length === 4 &&
    kind === 'projects' &&
    snap.projects.some((x) => x.slug === slug)
  )
    return { name: 'room', slug };
  if (extra === undefined && kind === 'crew' && snap.members.some((x) => x.slug === slug))
    return { name: 'member', slug };
  return { name: 'not-found' };
}

/** The beat a route belongs to, or null for addresses outside the journey. */
export function beatOf(route: Route): Beat | null {
  switch (route.name) {
    case 'home':
      return 'entrance';
    case 'projects':
    case 'project':
    case 'room':
      return 'projects';
    case 'crew':
    case 'member':
      return 'crew';
    case 'contact':
      return 'contact';
    case 'portal':
      return 'portal';
    default:
      return null;
  }
}

/** Every address that gets its own pre-built HTML page. */
export function allPaths(snap: Snapshot): string[] {
  return [
    ...BEATS.map((b) => b.path),
    ...snap.projects.flatMap((p) => [`/projects/${p.slug}/`, `/projects/${p.slug}/room/`]),
    ...snap.members.map((m) => `/crew/${m.slug}/`),
  ];
}
