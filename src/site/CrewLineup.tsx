import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { usePortraitLook } from '../avatar/look';
import { WavingPortrait } from '../avatar/WavingPortrait';
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
  usePortraitLook(box, on && profile);

  return (
    <div ref={box} className={profile ? 'crew crew--profile' : 'crew-wrap'}>
      <ul
        className={profile ? 'crew-grid' : 'mgrid'}
        style={profile ? ({ '--n': members.length } as React.CSSProperties) : undefined}
      >
        {members.map((m, i) => (
          <motion.li
            key={m.slug}
            initial={on ? { opacity: 0, y: 'var(--reveal-distance, 24px)' } : false}
            whileInView={on ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.08 }}
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

/** The big profile character: a themed scene with the avatar waving. Press it to make them wave harder. */
function Waver({ member, index }: { member: Member; index: number }) {
  const [waves, setWaves] = useState(0);
  const theme = popTheme(member.popPick);
  return (
    <button
      type="button"
      className={`profile-avatar a-${accentFor(index)}`}
      onClick={() => setWaves((n) => n + 1)}
      aria-label={`${member.name}. Select to make them wave.`}
    >
      <PopScene scene={theme.scene} />
      <span key={waves} className={`profile-avatar-fig ${waves ? 'is-hop' : ''}`}>
        <WavingPortrait record={member.avatar} />
      </span>
      <span className="profile-avatar-tag mono">
        {member.popPick ? `Into ${member.popPick}` : theme.caption}
      </span>
    </button>
  );
}
