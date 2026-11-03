import { useEffect, useState } from 'react';
import type { Route } from '../../routes';

/** A strip of masking tape. Sits across the corner or top edge of its parent. */
export function Tape({ className = '', tilt = -4 }: { className?: string; tilt?: number }) {
  return (
    <i
      className={`zn-tape ${className}`.trim()}
      style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

const DOODLES = {
  arrow: 'M6 40 C30 6 70 6 96 34 M96 34 L78 30 M96 34 L92 14',
  scribble: 'M4 22 C20 6 30 38 46 18 S70 34 84 12 S104 30 116 14',
  loop: 'M8 30 C30 -6 60 -6 56 24 C52 52 18 40 36 18 C54 -4 100 6 112 26',
  spark: 'M30 4 L33 24 L54 30 L33 36 L30 56 L27 36 L6 30 L27 24 Z',
  heart: 'M30 52 C6 34 4 12 20 8 C26 7 30 12 30 16 C30 12 34 7 40 8 C56 12 54 34 30 52 Z',
} as const;

/** A hand-drawn doodle in ink. Decorative only. */
export function Doodle({
  name,
  className = '',
}: {
  name: keyof typeof DOODLES;
  className?: string;
}) {
  const box = name === 'spark' || name === 'heart' ? '0 0 60 60' : '0 0 120 48';
  return (
    <svg
      className={`zn-doodle zn-doodle--${name} ${className}`.trim()}
      viewBox={box}
      aria-hidden="true"
    >
      <path d={DOODLES[name]} />
    </svg>
  );
}

/** A rubber stamp: a word in a rough outlined box, slightly rotated. */
export function Stamp({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`zn-stamp ${className}`.trim()}>{children}</span>;
}

const FOUND: Record<string, string> = {
  projects: 'the Projects shelf',
  project: 'a case study',
  crew: 'the Crew deck',
  member: 'a crew page',
  launchpad: 'the Launchpad',
  about: 'the About page',
  contact: 'the postbox',
  certificate: 'a certificate',
};

/**
 * Achievement-style toast: the first time you open a kind of page in this tab it says what you found.
 * Nothing is stored beyond the tab, nothing is sent anywhere, and it stays out of the way of screen readers' flow.
 */
export function FoundToast({ route }: { route: Route }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const what = FOUND[route.name];
    if (!what) return;
    let show: ReturnType<typeof setTimeout> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    try {
      const seen = JSON.parse(sessionStorage.getItem('alpha.found') ?? '[]') as string[];
      if (seen.includes(route.name)) return;
      sessionStorage.setItem('alpha.found', JSON.stringify([...seen, route.name]));
      show = setTimeout(() => setText(`Found ${what}`), 0);
      hide = setTimeout(() => setText(''), 3200);
    } catch {
      /* storage blocked: no toast */
    }
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [route.name]);
  if (!text) return null;
  return (
    <div className="zn-toast mono" role="status">
      <span aria-hidden="true">★</span> {text}
    </div>
  );
}
