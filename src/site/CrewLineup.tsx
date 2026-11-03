import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { usePortraitLook } from '../avatar/look';
import { Portrait } from '../avatar/Portrait';
import { accentFor } from './data';
import { useMotionOn } from './motion/context';
import type { LinkFn } from './parts';
import { crewRender, hasRender } from './renders';

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
              <Waver member={m} index={i} link={link} />
            ) : (
              <a
                className={`crew-card a-${accentFor(i)}`}
                href={link(`/crew/${m.slug}/`)}
                data-cursor="Meet"
              >
                <span className="crew-disc">
                  <Figure member={m} link={link} />
                </span>
                <span className="crew-tag">
                  <strong>{m.name}</strong>
                  <span className="mono">{m.codename ? `aka ${m.codename}` : m.role}</span>
                  {m.tagline && <em>{m.tagline}</em>}
                  {m.skills.length > 0 && (
                    <span className="crew-skills">
                      {m.skills.slice(0, 3).map((s) => (
                        <b key={s.name}>{s.name}</b>
                      ))}
                    </span>
                  )}
                  {snap && (
                    <span className="crew-stats mono">
                      {snap.memberships.filter((x) => x.memberSlug === m.slug).length} works ·{' '}
                      {snap.certifications.filter((c) => c.memberSlug === m.slug).length} trophies
                    </span>
                  )}
                </span>
              </a>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** The big profile character: tap or click to make it wave. Orbiting dots circle the disc. */
function Waver({ member, index, link }: { member: Member; index: number; link: LinkFn }) {
  const [waves, setWaves] = useState(0);
  return (
    <button
      type="button"
      className={`crew-card crew-card--profile a-${accentFor(index)}`}
      onClick={() => setWaves((n) => n + 1)}
      aria-label={`${member.name}. Select to make them wave.`}
    >
      <span className="orbit" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="crew-disc">
        <span key={waves} className={waves ? 'is-wave' : ''}>
          <Figure member={member} link={link} flip={waves > 0} />
        </span>
      </span>
    </button>
  );
}

/** The Blender render of a member, with a second expression on hover. Without a render, the live SVG character. */
function Figure({ member, link, flip = false }: { member: Member; link: LinkFn; flip?: boolean }) {
  if (!hasRender(member.slug)) return <Portrait record={member.avatar} />;
  return (
    <span className={`figure ${flip ? 'is-b' : ''}`}>
      <img
        className="figure-a"
        src={crewRender(link, member.slug, 'a')}
        alt=""
        width="480"
        height="480"
        loading="lazy"
        decoding="async"
      />
      <img
        className="figure-b"
        src={crewRender(link, member.slug, 'b')}
        alt=""
        width="480"
        height="480"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
