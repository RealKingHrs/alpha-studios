import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { Member } from '../content/schema';
import { accentFor, initials } from './data';
import type { LinkFn } from './parts';

type CanvasProps = {
  members: Member[];
  col: number;
  active: boolean;
  reacts: number[];
  reduce: boolean;
};

/** True when it is worth downloading and running the 3D avatars on this device. */
function canUse3D(): boolean {
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return false;
  } catch {
    return false;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return !nav.connection?.saveData && (nav.deviceMemory ?? 8) > 2;
}

/**
 * The crew as a row of coloured discs. Initials show at once; live 3D avatars take their place once the
 * row scrolls into view and the 3D code has loaded. A visitor who never scrolls here downloads none of it.
 */
export function CrewLineup({
  members,
  link,
  profile = false,
}: {
  members: Member[];
  link: LinkFn;
  profile?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [Canvas3D, setCanvas3D] = useState<ComponentType<CanvasProps> | null>(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const [reacts, setReacts] = useState<number[]>(() => members.map(() => 0));
  const [col, setCol] = useState(profile ? 320 : 200);
  const reduce =
    typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Know when the row is close to the screen, and when it is on it.
  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const early = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: '400px',
    });
    const live = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    early.observe(el);
    live.observe(el);
    return () => {
      early.disconnect();
      live.disconnect();
    };
  }, []);

  // The card width comes from the stylesheet, so the avatars always line up with the cards.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const card = el.querySelector<HTMLElement>('.crew-card');
      if (card) setCol(card.getBoundingClientRect().width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!near || Canvas3D || !canUse3D()) return;
    let live = true;
    import('./CrewCanvas').then((m) => live && setCanvas3D(() => m.default));
    return () => {
      live = false;
    };
  }, [near, Canvas3D]);

  return (
    <div ref={box} className={`crew ${profile ? 'crew--profile' : ''} ${Canvas3D ? 'has3d' : ''}`}>
      <div className="crew-inner" style={{ width: col * members.length }}>
        <ul className="crew-grid" style={{ '--n': members.length } as React.CSSProperties}>
          {members.map((m, i) => (
            <li key={m.slug}>
              <a
                className={`crew-card a-${accentFor(i)}`}
                href={link(`/crew/${m.slug}/`)}
                onPointerEnter={() => setReacts((r) => r.map((v, j) => (j === i ? v + 1 : v)))}
              >
                <span className="crew-disc" aria-hidden="true">
                  <span className="crew-initials display">{initials(m.name)}</span>
                </span>
                {!profile && (
                  <span className="crew-tag">
                    <strong>{m.name}</strong>
                    <span className="mono">{m.role}</span>
                  </span>
                )}
                {profile && <span className="visually-hidden">{m.name}</span>}
              </a>
            </li>
          ))}
        </ul>
        {Canvas3D && col > 0 && (
          <div
            className="crew-canvas"
            style={{ width: col * members.length, height: col }}
            aria-hidden="true"
          >
            <Canvas3D members={members} col={col} active={active} reacts={reacts} reduce={reduce} />
          </div>
        )}
      </div>
    </div>
  );
}
