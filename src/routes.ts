import type { Snapshot } from './content/schema';

export type Route =
  | { name: 'home' }
  | { name: 'projects' }
  | { name: 'crew' }
  | { name: 'contact' }
  | { name: 'launchpad' }
  | { name: 'project'; slug: string }
  | { name: 'member'; slug: string }
  | { name: 'certificate'; slug: string; id: string }
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
  if (p === '/launchpad') return { name: 'launchpad' };
  const [, kind, slug, extra, certId] = p.split('/');
  if (kind === 'crew' && extra === 'certificates' && certId && p.split('/').length === 5) {
    if (snap.certifications.some((c) => c.id === certId && c.memberSlug === slug))
      return { name: 'certificate', slug, id: certId };
    return { name: 'not-found' };
  }
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
    '/projects/',
    '/crew/',
    '/launchpad/',
    '/contact/',
    '/portal/',
    ...snap.projects.map((p) => `/projects/${p.slug}/`),
    ...snap.members.map((m) => `/crew/${m.slug}/`),
    ...snap.certifications.map((c) => `/crew/${c.memberSlug}/certificates/${c.id}/`),
  ];
}
