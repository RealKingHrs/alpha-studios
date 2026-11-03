import { animate, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Snapshot } from '../content/schema';
import { useMotionOn } from './motion/context';

/** A number that counts up once when it scrolls into view. Without motion, it simply shows the final value. */
export function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const on = useMotionOn();
  useEffect(() => {
    const el = ref.current;
    if (!on || !seen || !el) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [on, seen, to]);
  return <span ref={ref}>{to}</span>;
}

/** The studio at a glance, counted from the real content. */
export function Counters({ snap }: { snap: Snapshot }) {
  const tech = new Set(snap.projects.flatMap((p) => p.tech)).size;
  const platforms = new Set(snap.projects.flatMap((p) => p.platforms)).size;
  const stats = [
    [snap.projects.length, 'Projects shipped'],
    [snap.members.length, 'People on the crew'],
    [tech, 'Technologies in use'],
    [platforms, 'Platforms reached'],
  ] as const;
  return (
    <section className="s-counters" aria-label="The studio at a glance">
      <dl className="s-wrap">
        {stats.map(([n, label]) => (
          <div key={label}>
            <dt className="mono">{label}</dt>
            <dd className="display">
              <Count to={n} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
