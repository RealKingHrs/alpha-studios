import type { Snapshot } from './content/schema';
import { matchRoute } from './routes';
import { Home, MemberPage, NotFound, Portal, ProjectPage } from './pages/pages';

export function App({ snap, pathname, base }: { snap: Snapshot; pathname: string; base: string }) {
  const route = matchRoute(pathname, base, snap);
  const link = (path: string) => base + path.replace(/^\//, '');
  switch (route.name) {
    case 'home':
      return <Home snap={snap} link={link} />;
    case 'project':
      return <ProjectPage snap={snap} slug={route.slug} link={link} />;
    case 'member':
      return <MemberPage snap={snap} slug={route.slug} link={link} />;
    case 'portal':
      return <Portal link={link} />;
    default:
      return <NotFound link={link} />;
  }
}
