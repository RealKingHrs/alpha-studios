import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../content/schema';
import { Intro } from '../intro/Intro';
import {
  Contact,
  Gallery,
  Hall,
  Home,
  MemberPage,
  NotFound,
  Portal,
  ProjectPage,
  RoomPage,
} from '../pages/overlay';
import { pageMeta } from '../meta';
import { BEATS, beatOf, matchRoute } from '../routes';
import { useSearch, usePathname } from '../router';
import { stepLinks } from '../nav';
import { Controls } from '../ui/Controls';
import { PositionIndex } from '../ui/PositionIndex';
import { cueForMove, cueLabel } from '../audio/cues';
import { createSoundController, rememberSound, wantedSound } from '../audio/controller';
import { Effects } from '../ui/Effects';
import { Toggles } from '../ui/Toggles';
import { hasSeenIntro, markIntroSeen, safeGet, safeSet } from '../util/storage';
import { buildStops } from '../vault/layout';
import { chooseMode, parseOverrides, type Mode } from '../vault/mode';

const VaultLayer = lazy(() => import('../vault/VaultLayer'));
const DevPanel = lazy(() => import('../dev/Panel'));

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

export function ExploreApp({
  snap,
  pathname: initial,
  base,
}: {
  snap: Snapshot;
  pathname: string;
  base: string;
}) {
  const pathname = usePathname(initial);
  const search = useSearch();
  // Inside Explore every link keeps the query string, so ?explore (and any test switches) stay on.
  const link = useCallback(
    (path: string) => base + path.replace(/^\//, '') + search,
    [base, search],
  );
  const route = matchRoute(pathname, base, snap);
  const beat = beatOf(route);
  const stops = useMemo(() => buildStops(snap.projects.map((p) => p.slug)), [snap]);
  const steps = stepLinks(route, stops);

  // Enhancement state: all unset on the server and during hydration, so the first paint is plain HTML.
  const [env, setEnv] = useState<{ mode: Mode; reduceMotion: boolean; dev: boolean } | null>(null);
  const [mode, setMode] = useState<Mode>('fallback');
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // Sound: off until the visitor turns it on. The engine is fetched only then.
  const [sound] = useState(() =>
    createSoundController(async () => {
      const { createSound } = await import('../audio/engine');
      const w = window as unknown as {
        AudioContext: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext ?? w.webkitAudioContext!;
      return () => createSound(Ctor);
    }),
  );
  const [soundOn, setSoundOn] = useState(false);
  const [cue, setCue] = useState<string | null>(null);
  const [fxChoice, setFxChoice] = useState(true);
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

  // Explore is the dark theme: flag it on the page for as long as it is shown.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('explore');
    return () => root.classList.remove('explore', 'vault', 'lite', 'fx');
  }, []);
  const leave = useMemo(() => {
    const p = new URLSearchParams(search);
    p.delete('explore');
    const q = p.toString();
    return base + pathname.slice(base.length) + (q ? `?${q}` : '');
  }, [search, base, pathname]);

  const enhanced = env !== null && mode !== 'fallback';
  const fxAvailable = env !== null && !env.reduceMotion;
  const fxOn = fxAvailable && fxChoice;

  // Remember the effects choice, read after mount so the first paint matches the server.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFxChoice(safeGet('alpha:fx') !== '0');
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('fx', fxOn);
  }, [fxOn]);

  const toggleSound = useCallback(async () => {
    if (soundOn) {
      sound.disable();
      setSoundOn(false);
      rememberSound(false);
    } else {
      await sound.enable();
      setSoundOn(true);
      rememberSound(true);
    }
  }, [sound, soundOn]);

  // A remembered "on" still waits for the visitor's first touch, click or key press after the intro.
  useEffect(() => {
    if (!introDone || !wantedSound()) return;
    const arm = () => void sound.enable().then(() => setSoundOn(true));
    const opts = { once: true } as const;
    window.addEventListener('pointerdown', arm, opts);
    window.addEventListener('keydown', arm, opts);
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, [introDone, sound]);

  // A soft tick between places, a chime on opening a room. Each is also shown as text.
  const lastRoute = useRef(route);
  useEffect(() => {
    const c = cueForMove(lastRoute.current, route);
    lastRoute.current = route;
    if (!c) return;
    sound.cue(c);
    if (!sound.on) return;
    setCue(cueLabel[c]);
    const id = window.setTimeout(() => setCue(null), 2200);
    return () => clearTimeout(id);
  }, [route, sound]);
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
    case 'room':
      page = <RoomPage snap={snap} slug={route.slug} link={link} />;
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
    <div className="explore-root">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <a className="leave-explore" href={leave}>
        Leave 3D
      </a>
      {enhanced && (
        <Suspense fallback={null}>
          <VaultLayer
            snap={snap}
            pathname={pathname}
            base={base}
            mode={mode as 'full' | 'lite'}
            reduceMotion={env.reduceMotion}
            effects={fxOn}
            dev={env.dev}
            link={link}
            onReady={onReady}
            onSlow={onSlow}
          />
        </Suspense>
      )}
      {page}
      <PositionIndex current={beat} link={link} />
      {enhanced && <Controls steps={steps} link={link} />}
      <div className="visually-hidden" role="status" aria-live="polite">
        {label ?? ''}
      </div>
      {env && introDone && (
        <Toggles
          soundOn={soundOn}
          fxOn={fxOn}
          fxAvailable={fxAvailable}
          cue={cue}
          onSound={() => void toggleSound()}
          onFx={() => {
            safeSet('alpha:fx', fxChoice ? '0' : '1');
            setFxChoice(!fxChoice);
          }}
        />
      )}
      {fxOn && <Effects />}
      {env?.dev && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
      {env && !introDone && (
        <Intro
          variant="vault"
          ready={introReady}
          reduceMotion={env.reduceMotion}
          firstVisit={firstVisit}
          onDone={onIntroDone}
        />
      )}
    </div>
  );
}
