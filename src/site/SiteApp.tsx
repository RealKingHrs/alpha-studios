import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Snapshot } from '../content/schema';
import { Intro } from '../intro/Intro';
import { pageMeta } from '../meta';
import { matchRoute } from '../routes';
import { usePathname } from '../router';
import { Effects } from '../ui/Effects';
import { hasSeenIntro, markIntroSeen, safeGet, safeSet } from '../util/storage';
import {
  CaseStudy,
  ContactPage,
  CrewPage,
  CrewProfile,
  Home,
  NotFoundPage,
  PortalDoor,
  WorkPage,
} from './pages';
import { Footer, Header } from './parts';

/** The default site: bright, editorial, and complete as plain HTML before any script runs. */
export function SiteApp({
  snap,
  pathname: initial,
  base,
}: {
  snap: Snapshot;
  pathname: string;
  base: string;
}) {
  const pathname = usePathname(initial);
  const route = matchRoute(pathname, base, snap);
  const link = useCallback((path: string) => base + path.replace(/^\//, ''), [base]);
  const here = base + pathname.slice(base.length);
  const exploreHref = `${here}?explore`;

  const [reduce, setReduce] = useState(false);
  const [fxChoice, setFxChoice] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [introDone, setIntroDone] = useState(true);
  const firstVisit = useMemo(() => (typeof window === 'undefined' ? false : !hasSeenIntro()), []);

  // Everything below needs the browser, so it waits until after hydration and the first paint matches the server.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const r =
      matchMedia('(prefers-reduced-motion: reduce)').matches || q.get('motion') === 'reduce';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduce(r);
    setFxChoice(safeGet('alpha:fx') !== '0');
    // The opening is for the first visit to the start page only.
    setIntroDone(!(firstVisit && matchRoute(location.pathname, base, snap).name === 'home'));
    setMounted(true);
    document.documentElement.classList.add('ready');
  }, [base, snap, firstVisit]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduce);
  }, [reduce]);

  const fxAvailable = mounted && !reduce;
  const fxOn = fxAvailable && fxChoice;
  useEffect(() => {
    document.documentElement.classList.toggle('fx', fxOn);
    return () => document.documentElement.classList.remove('fx');
  }, [fxOn]);

  // Keep the tab title and description in step with the address, and start each page at its top.
  useEffect(() => {
    const { title, description } = pageMeta(pathname, base, snap);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (!location.hash) window.scrollTo(0, 0);
  }, [pathname, base, snap]);

  const onIntroDone = useCallback(() => {
    markIntroSeen();
    setIntroDone(true);
  }, []);

  const props = { snap, link, asset: link, exploreHref };
  let page;
  switch (route.name) {
    case 'home':
      page = <Home {...props} />;
      break;
    case 'projects':
      page = <WorkPage {...props} />;
      break;
    case 'project':
    case 'room':
      page = <CaseStudy {...props} slug={route.slug} />;
      break;
    case 'crew':
      page = <CrewPage {...props} />;
      break;
    case 'member':
      page = <CrewProfile {...props} slug={route.slug} />;
      break;
    case 'contact':
      page = <ContactPage {...props} />;
      break;
    case 'portal':
      page = <PortalDoor link={link} />;
      break;
    default:
      page = <NotFoundPage link={link} />;
  }

  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header route={route} link={link} exploreHref={exploreHref} />
      <main id="main">{page}</main>
      <Footer
        snap={snap}
        link={link}
        fxAvailable={fxAvailable}
        fxOn={fxOn}
        onFx={() => {
          safeSet('alpha:fx', fxChoice ? '0' : '1');
          setFxChoice(!fxChoice);
        }}
      />
      {fxOn && <Effects />}
      {mounted && !introDone && (
        <Intro variant="site" ready reduceMotion={reduce} firstVisit onDone={onIntroDone} />
      )}
    </div>
  );
}
