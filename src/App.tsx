import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { Snapshot } from './content/schema';
import { Intro } from './intro/Intro';
import {
  Contact,
  Gallery,
  Hall,
  Home,
  MemberPage,
  NotFound,
  Portal,
  ProjectPage,
} from './pages/pages';
import { pageMeta } from './meta';
import { BEATS, beatOf, matchRoute } from './routes';
import { usePathname } from './router';
import { Controls } from './ui/Controls';
import { PositionIndex } from './ui/PositionIndex';
import { hasSeenIntro, markIntroSeen } from './util/storage';
import { chooseMode, parseOverrides, type Mode } from './vault/mode';

const VaultLayer = lazy(() => import('./vault/VaultLayer'));
const DevPanel = lazy(() => import('./dev/Panel'));

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Reads the device once, after hydration. Never runs on the server. */
async function detectMode(search: string) {
  const mq = (q: string) => matchMedia(q).matches;
  const o = parseOverrides(search, mq('(prefers-reduced-motion: reduce)'));
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };
  let lowBattery = false;
  try {
    const b = await nav.getBattery?.();
    lowBattery = !!b && !b.charging && b.level < 0.2;
  } catch {
    /* not available */
  }
  const mode = chooseMode({
    webgl: webglAvailable(),
    width: innerWidth,
    coarsePointer: mq('(pointer: coarse)'),
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData,
    lowBattery,
    override: o.mode,
  });
  return { mode, reduceMotion: o.reduceMotion, dev: o.dev };
}

export function App({
  snap,
  pathname: initial,
  base,
}: {
  snap: Snapshot;
  pathname: string;
  base: string;
}) {
  const pathname = usePathname(initial);
  const link = useCallback((path: string) => base + path.replace(/^\//, ''), [base]);
  const route = matchRoute(pathname, base, snap);
  const beat = beatOf(route);

  // Enhancement state: all unset on the server and during hydration, so the first paint is plain HTML.
  const [env, setEnv] = useState<{ mode: Mode; reduceMotion: boolean; dev: boolean } | null>(null);
  const [mode, setMode] = useState<Mode>('fallback');
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const firstVisit = useMemo(() => (typeof window === 'undefined' ? true : !hasSeenIntro()), []);

  useEffect(() => {
    let live = true;
    detectMode(location.search).then((e) => {
      if (!live) return;
      setEnv(e);
      setMode(e.mode);
      document.documentElement.classList.add('ready');
    });
    return () => {
      live = false;
    };
  }, []);

  const enhanced = env !== null && mode !== 'fallback';
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('vault', enhanced);
    root.classList.toggle('lite', mode === 'lite');
    root.classList.toggle('reduce-motion', !!env?.reduceMotion);
  }, [enhanced, mode, env]);

  // With no 3D to wait for, the intro has nothing to load.
  const introReady = ready || (env !== null && mode === 'fallback');

  // Keep the tab title and description in step with the address.
  useEffect(() => {
    const { title, description } = pageMeta(pathname, base, snap);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [pathname, base, snap]);

  // Return to the top of the page when plain pages change.
  useEffect(() => {
    if (!enhanced) window.scrollTo(0, 0);
  }, [pathname, enhanced]);

  const onReady = useCallback(() => setReady(true), []);
  const onSlow = useCallback(() => setMode((m) => (m === 'full' ? 'lite' : m)), []);
  const onIntroDone = useCallback(() => {
    markIntroSeen();
    setIntroDone(true);
  }, []);

  const label = BEATS.find((b) => b.id === beat)?.label;
  let page;
  switch (route.name) {
    case 'home':
      page = <Home snap={snap} link={link} />;
      break;
    case 'projects':
      page = <Hall snap={snap} link={link} />;
      break;
    case 'crew':
      page = <Gallery snap={snap} link={link} />;
      break;
    case 'contact':
      page = <Contact snap={snap} link={link} />;
      break;
    case 'project':
      page = <ProjectPage snap={snap} slug={route.slug} link={link} />;
      break;
    case 'member':
      page = <MemberPage snap={snap} slug={route.slug} link={link} />;
      break;
    case 'portal':
      page = <Portal link={link} />;
      break;
    default:
      page = <NotFound link={link} />;
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {enhanced && (
        <Suspense fallback={null}>
          <VaultLayer
            snap={snap}
            pathname={pathname}
            base={base}
            mode={mode as 'full' | 'lite'}
            reduceMotion={env.reduceMotion}
            dev={env.dev}
            link={link}
            onReady={onReady}
            onSlow={onSlow}
          />
        </Suspense>
      )}
      {page}
      <PositionIndex current={beat} link={link} />
      {enhanced && <Controls current={beat} link={link} />}
      <div className="visually-hidden" role="status" aria-live="polite">
        {label ?? ''}
      </div>
      {env?.dev && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
      {env && !introDone && (
        <Intro
          ready={introReady}
          reduceMotion={env.reduceMotion}
          firstVisit={firstVisit}
          onDone={onIntroDone}
        />
      )}
    </>
  );
}
