import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { usePortraitLook } from '../avatar/look';
import { FullBody } from '../avatar/FullBody';
import { accentFor } from './data';
import { useMotionOn } from './motion/context';
import type { LinkFn } from './parts';
import { CrewCard } from './CrewCard';
import { PopScene } from './PopScene';
import { popTheme } from './popTheme';

/**
 * The crew as a row of geometric characters on coloured discs. They look toward the cursor, lift their brows
 * and hop when you hover, and pop in one after another as the row scrolls into view.
 */
export function CrewLineup({
  members,
  link,
  profile = false,
  snap,
}: {
  members: Member[];
  link: LinkFn;
  profile?: boolean;
  snap?: Snapshot;
}) {
  const box = useRef<HTMLDivElement>(null);
  const on = useMotionOn();
  usePortraitLook(box, on);

  return (
    <div ref={box} className={`crew ${profile ? 'crew--profile' : ''}`}>
      <ul className="crew-grid" style={{ '--n': members.length } as React.CSSProperties}>
        {members.map((m, i) => (
          <motion.li
            key={m.slug}
            initial={on ? { opacity: 0, y: 46, scale: 0.88 } : false}
            whileInView={on ? { opacity: 1, y: 0, scale: 1 } : undefined}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.09 }}
          >
            {profile ? (
              <Waver member={m} index={i} />
            ) : snap ? (
              <CrewCard member={m} index={i} link={link} snap={snap} />
            ) : null}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** The big profile character: tap or click to make it wave. Orbiting dots circle the disc. */
function Waver({ member, index }: { member: Member; index: number }) {
  const [waves, setWaves] = useState(0);
  return (
    <button
      type="button"
      className={`crew-card crew-card--profile pcard a-${accentFor(index)}`}
      onClick={() => setWaves((n) => n + 1)}
      aria-label={`${member.name}. Select to make them wave.`}
    >
      <PopScene scene={popTheme(member.popPick).scene} />
      <span className="orbit" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span key={waves} className={`wave-wrap ${waves ? 'is-wave' : ''}`}>
        <FullBody record={member.avatar} />
      </span>
    </button>
  );
}
