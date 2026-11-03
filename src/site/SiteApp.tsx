import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../content/schema';
import { Intro } from '../intro/Intro';
import { pageMeta } from '../meta';
import { matchRoute } from '../routes';
import { usePathname } from '../router';
import { hasSeenIntro, markIntroSeen } from '../util/storage';
import { MotionProvider, useIsoLayoutEffect } from './motion/context';
import { WIPE } from './motion/helpers';
import { Cursor } from './motion/Cursor';
import { useTapRipples } from './motion/ripples';
import { scrollToTop, SmoothScroll } from './motion/SmoothScroll';
import { PageWipe, type WipePhase } from './PageWipe';
import {
  CaseStudy,
  ContactPage,
  CrewPage,
  CrewProfile,
  HOME_SECTIONS,
  Home,
  NotFoundPage,
  PortalDoor,
  WorkPage,
} from './pages';
import { AboutPage } from './AboutPage';
import { Cryptex, useCryptexTriggers } from './Cryptex';
import { FoundToast } from './fx/FoundToast';
import { CertificatePage } from './CertificatePage';
import { LaunchpadPage } from './Launchpad';
import { Footer, Header, SectionIndex } from './parts';

/** The colour of the block that sweeps in when you change page, by where you are going. */
const WIPE_ACCENT: Record<string, string> = {
  home: 'tomato',
  projects: 'sun',
  project: 'sun',
  crew: 'mint',
  member: 'mint',
  certificate: 'mint',
  launchpad: 'mint',
  about: 'sky',
  contact: 'lilac',
};

/** The site: bold, animated, and complete as plain HTML before any script runs. */
export function SiteApp({
  snap,
  pathname: initial,
  base,
}: {
  snap: Snapshot;
  pathname: string;
  base: string;
}) {
  const target = usePathname(initial);
  const [shown, setShown] = useState(initial);
  const route = matchRoute(shown, base, snap);
  const link = useCallback((path: string) => base + path.replace(/^\//, ''), [base]);

  const [allowed, setAllowed] = useState(false); // false on the server and until the first check: nothing animates
  const [fine, setFine] = useState(false);
  const [introDone, setIntroDone] = useState(true);
  const [phase, setPhase] = useState<WipePhase>('idle');
  const [announce, setAnnounce] = useState('');
  const firstVisit = useMemo(() => (typeof window === 'undefined' ? false : !hasSeenIntro()), []);
  const arrived = useRef(false);

  // Runs before the first paint on the client, so motion starts from a clean frame instead of flashing.
  useIsoLayoutEffect(() => {
    const q = new URLSearchParams(location.search);
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches || q.get('motion') === 'reduce';
    setAllowed(!reduced);
    setFine(matchMedia('(pointer: fine)').matches);
    setIntroDone(
      !(firstVisit && matchRoute(location.pathname, base, snap).name === 'home' && !reduced),
    );
    document.documentElement.classList.toggle('reduce-motion', reduced);
    document.documentElement.classList.add('ready');
  }, [base, snap, firstVisit]);

  const [cryptex, setCryptex] = useState(false);
  const openCryptex = useCallback(() => setCryptex(true), []);
  useCryptexTriggers(openCryptex);
  const enabled = allowed;
  useEffect(() => {
    document.documentElement.classList.toggle('fx', enabled && fine);
    return () => document.documentElement.classList.remove('fx');
  }, [enabled, fine]);
  useTapRipples(enabled);

  // Changing page: cover the old one with bands, swap underneath, then uncover. Without motion, just swap.
  useEffect(() => {
    if (target === shown) return;
    if (!enabled) {
      // The address changed outside React (back button, link), so the page it shows follows it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(target);
      scrollToTop();
      return;
    }
    setPhase('cover');
    const swap = setTimeout(() => {
      setShown(target);
      scrollToTop(true);
      setPhase('reveal');
    }, WIPE.cover);
    const done = setTimeout(() => setPhase('idle'), WIPE.total);
    return () => {
      clearTimeout(swap);
      clearTimeout(done);
    };
    // `shown` is deliberately read once: the swap itself changes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled]);

  // Title and description follow the page, focus moves to its heading, and screen readers are told.
  useEffect(() => {
    const { title, description } = pageMeta(shown, base, snap);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
    setAnnounce(title.split(' | ')[0]);
  }, [shown, base, snap]);

  const onIntroDone = useCallback(() => {
    markIntroSeen();
    setIntroDone(true);
  }, []);

  const props = { snap, link, asset: link };
  let page;
  switch (route.name) {
    case 'home':
      page = <Home {...props} />;
      break;
    case 'projects':
      page = <WorkPage {...props} />;
      break;
    case 'project':
      page = <CaseStudy {...props} slug={route.slug} />;
      break;
    case 'crew':
      page = <CrewPage {...props} />;
      break;
    case 'member':
      page = <CrewProfile {...props} slug={route.slug} />;
      break;
    case 'certificate':
      page = <CertificatePage snap={snap} slug={route.slug} id={route.id} link={link} />;
      break;
    case 'about':
      page = <AboutPage snap={snap} link={link} />;
      break;
    case 'contact':
      page = <ContactPage {...props} />;
      break;
    case 'launchpad':
      page = <LaunchpadPage snap={snap} link={link} />;
      break;
    case 'portal':
      page = <PortalDoor link={link} />;
      break;
    default:
      page = <NotFoundPage link={link} />;
  }

  return (
    <MotionProvider enabled={enabled}>
      <div className="site">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header route={route} link={link} />
        <main id="main" className={`page page--${phase}`}>
          {page}
        </main>
        <Footer link={link} />
        {route.name === 'home' && <SectionIndex labels={HOME_SECTIONS} />}
        <SmoothScroll enabled={enabled} />
        {enabled && fine && <Cursor />}
        <PageWipe phase={phase} accent={WIPE_ACCENT[route.name] ?? 'sun'} />
        <FoundToast route={route} />
        {cryptex && <Cryptex link={link} onClose={() => setCryptex(false)} />}
        <div className="visually-hidden" role="status" aria-live="polite">
          {announce}
        </div>
        {!introDone && <Intro ready reduceMotion={!allowed} firstVisit onDone={onIntroDone} />}
      </div>
    </MotionProvider>
  );
}
