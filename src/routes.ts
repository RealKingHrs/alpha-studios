import type { Snapshot } from './content/schema';

export type Route =
  | { name: 'home' }
  | { name: 'project'; slug: string }
  | { name: 'member'; slug: string }
  | { name: 'portal' }
  | { name: 'not-found' };

/** Strip the deploy base and trailing slash, then match a path to a route. */
export function matchRoute(pathname: string, base: string, snap: Snapshot): Route {
  let p = pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname;
  p = p.replace(/\/+$/, '') || '/';
  if (p === '/') return { name: 'home' };
  if (p === '/portal') return { name: 'portal' };
  const [, kind, slug, extra] = p.split('/');
  if (extra === undefined && kind === 'projects' && snap.projects.some((x) => x.slug === slug))
    return { name: 'project', slug };
  if (extra === undefined && kind === 'crew' && snap.members.some((x) => x.slug === slug))
    return { name: 'member', slug };
  return { name: 'not-found' };
}

/** Every address that gets its own pre-built HTML page. */
export function allPaths(snap: Snapshot): string[] {
  return [
    '/',
    '/portal/',
    ...snap.projects.map((p) => `/projects/${p.slug}/`),
    ...snap.members.map((m) => `/crew/${m.slug}/`),
  ];
}
