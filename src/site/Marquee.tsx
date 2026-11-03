import {
  motion,
  useAnimationFrame,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useRef } from 'react';
import { useMotionOn } from './motion/context';
import { marqueeStep, velocitySkew } from './motion/helpers';
import { marqueeBase } from './motion/viewport';

/**
 * A band of words sliding past on an accent colour. With motion on, it speeds up and leans while the page
 * scrolls. Without it, a plain CSS slide (or, for reduced motion, nothing). Copies are hidden from assistive tech.
 */
export function Marquee({
  items,
  accent = 'sun',
  label,
  reverse = false,
}: {
  items: string[];
  accent?: string;
  label: string;
  /** Runs the other way: the same loop, mirrored in position, never in text. */
  reverse?: boolean;
}) {
  const on = useMotionOn();
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLUListElement>(null);
  const x = useRef(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 300, damping: 60 });
  const skewX = useTransform(velocity, (v) => velocitySkew(v));

  useAnimationFrame((_, delta) => {
    if (!on || !track.current || !first.current) return;
    x.current = marqueeStep(
      x.current,
      delta / 1000,
      velocity.get(),
      first.current.offsetWidth,
      marqueeBase(innerWidth),
    );
    const pos = reverse ? -first.current.offsetWidth - x.current : x.current;
    track.current.style.transform = `translate3d(${pos}px,0,0)`;
  });

  if (items.length === 0) return null;
  const row = (hidden: boolean, ref?: React.Ref<HTMLUListElement>) => (
    <ul className="marquee-row" aria-hidden={hidden || undefined} ref={ref}>
      {items.map((t, i) => (
        <li key={`${t}-${i}`}>
          {t}
          <span aria-hidden="true"> ✦ </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className={`marquee a-${accent} ${reverse ? 'marquee--reverse' : ''} ${on ? 'is-js' : ''}`}
      aria-label={label}
    >
      <motion.div style={on ? { skewX } : undefined}>
        <div className="marquee-track" ref={track}>
          {row(false, first)}
          {row(true)}
          {row(true)}
        </div>
      </motion.div>
    </section>
  );
}
