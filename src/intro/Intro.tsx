import { useEffect, useRef, useState } from 'react';
import { MARK_GRADIENT, MARK_PATH, MARK_VIEWBOX, MARK_WIDTH } from '../brand/mark';

type Phase = 'draw' | 'fill' | 'hold' | 'open' | 'fade' | 'gone';

/** The full first-visit sequence, in multiples of --dur-slow. Repeat visits run it much shorter. */
const FULL = { draw: 2.2, fill: 1.25, open: 1.4 };
const REPEAT_SCALE = 0.3;
/** How long the still logo is held in reduced motion. A pause, not an animation. */
const STILL_MS = 800;
/** The most the intro waits for the scene. A device that cannot render must never be trapped behind it. */
const MAX_WAIT_MS = 6000;
const slowMs = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-slow')) || 720;

interface Props {
  /** True once the scene can show its first frame. The intro doubles as the loader. */
  ready: boolean;
  reduceMotion: boolean;
  firstVisit: boolean;
  onDone: () => void;
}

/**
 * The silent opening: the alpha draws as one stroke, fills with chrome, the gold spreads along the
 * flick, then the doors part. Reduced motion shows a still logo that fades.
 */
export function Intro({ ready, reduceMotion, firstVisit, onDone }: Props) {
  const [t] = useState(() => {
    const unit = slowMs() * (firstVisit ? 1 : REPEAT_SCALE);
    return { draw: FULL.draw * unit, fill: FULL.fill * unit, open: FULL.open * unit };
  });
  const [phase, setPhase] = useState<Phase>(reduceMotion ? 'fill' : 'draw');
  const minElapsed = useRef(false);

  // Timeline. 'hold' waits here until both the minimum time has passed and the scene is ready.
  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (reduceMotion) {
      at(STILL_MS, () => {
        minElapsed.current = true;
        setPhase('hold');
      });
    } else {
      at(t.draw, () => setPhase('fill'));
      at(t.draw + t.fill, () => {
        minElapsed.current = true;
        setPhase('hold');
      });
    }
    return () => timers.forEach(clearTimeout);
    // The timeline is fixed for the life of the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'hold' && ready && minElapsed.current) setPhase(reduceMotion ? 'fade' : 'open');
  }, [phase, ready, reduceMotion]);

  useEffect(() => {
    if (phase !== 'hold') return;
    const id = window.setTimeout(() => setPhase(reduceMotion ? 'fade' : 'open'), MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase !== 'open' && phase !== 'fade') return;
    const id = window.setTimeout(() => setPhase('gone'), reduceMotion ? 400 : t.open);
    return () => clearTimeout(id);
  }, [phase, reduceMotion, t.open]);

  useEffect(() => {
    if (phase === 'gone') onDone();
  }, [phase, onDone]);

  const skip = () =>
    setPhase((p) =>
      p === 'gone' || p === 'open' || p === 'fade' ? p : reduceMotion ? 'fade' : 'open',
    );

  useEffect(() => {
    // Capture phase, so skipping the intro never also triggers another Escape shortcut.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      skip();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (phase === 'gone') return null;
  return (
    <div
      className={`intro intro--${phase} intro--site`}
      role="img"
      aria-label="Alpha Studios"
      style={
        {
          '--t-draw': `${t.draw}ms`,
          '--t-fill': `${t.fill}ms`,
          '--t-open': `${t.open}ms`,
        } as React.CSSProperties
      }
    >
      {['midnight', 'midnight-2', 'midnight', 'midnight-2', 'midnight'].map((c, i) => (
        <div
          key={c}
          className="intro-band"
          style={{ '--i': i, background: `var(--${c})` } as React.CSSProperties}
        />
      ))}
      <svg className="intro-mark" viewBox={MARK_VIEWBOX} aria-hidden="true">
        <defs>
          <linearGradient
            id="intro-stroke"
            gradientUnits="userSpaceOnUse"
            x1={MARK_GRADIENT.x1}
            y1={MARK_GRADIENT.y1}
            x2={MARK_GRADIENT.x2}
            y2={MARK_GRADIENT.y2}
          >
            <stop offset={MARK_GRADIENT.at} style={{ stopColor: 'var(--ink)' }} />
            <stop offset={MARK_GRADIENT.at} style={{ stopColor: 'var(--gold)' }} />
          </linearGradient>
        </defs>
        <path className="intro-stroke" d={MARK_PATH} strokeWidth={MARK_WIDTH} pathLength={1} />
      </svg>
      {phase !== 'fade' && (
        <button type="button" className="intro-skip" onClick={skip}>
          Skip intro
        </button>
      )}
    </div>
  );
}
