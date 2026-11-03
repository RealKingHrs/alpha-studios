import { motion } from 'motion/react';
import { useRef } from 'react';
import type { Snapshot } from '../content/schema';
import { usePortraitLook } from '../avatar/look';
import { CrewCard } from './CrewCard';
import { useMotionOn } from './motion/context';
import type { LinkFn } from './parts';

/**
 * The crew as a row of editorial cards. The characters look toward the cursor, and the cards rise in one after
 * another as the row scrolls into view. A slim progress line under the row replaces the browser's scrollbar.
 */
export function CrewLineup({ link, snap }: { link: LinkFn; snap: Snapshot }) {
  const box = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const on = useMotionOn();
  usePortraitLook(box, on);
  const members = snap.members;

  return (
    <div className="crew-wrap">
      <div
        ref={box}
        className="crew"
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollWidth - el.clientWidth;
          bar.current?.style.setProperty('--p', String(max > 0 ? el.scrollLeft / max : 0));
        }}
      >
        <ul className="crew-grid" style={{ '--n': members.length } as React.CSSProperties}>
          {members.map((m, i) => (
            <motion.li
              key={m.slug}
              initial={on ? { opacity: 0, y: 46, scale: 0.88 } : false}
              whileInView={on ? { opacity: 1, y: 0, scale: 1 } : undefined}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 }}
            >
              <CrewCard member={m} index={i} link={link} snap={snap} />
            </motion.li>
          ))}
        </ul>
      </div>
      <span className="crew-progress" aria-hidden="true">
        <i ref={bar} />
      </span>
    </div>
  );
}
