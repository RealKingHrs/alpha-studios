import { useRef, useState } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { FullBody } from '../avatar/FullBody';
import { accentFor } from './data';
import { useMotionOn } from './motion/context';
import { tiltFor } from './motion/helpers';
import type { LinkFn } from './parts';
import { PopScene } from './PopScene';
import { popTheme } from './popTheme';
import { SkillGauges } from './SkillGauge';

/**
 * A collectible card. The front has a full-body character in front of a scene built from the member's favourite
 * show or game; it tilts toward the pointer and shines. Pressing the flip button turns it over to the skills,
 * shown as tubes that fill to each rating. Without script the card is still a link to the full profile.
 */
export function CrewCard({
  member,
  index,
  link,
  snap,
}: {
  member: Member;
  index: number;
  link: LinkFn;
  snap: Snapshot;
}) {
  const on = useMotionOn();
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const theme = popTheme(member.popPick);
  const works = snap.memberships
    .filter((x) => x.memberSlug === member.slug)
    .flatMap((x) => {
      const p = snap.projects.find((q) => q.slug === x.projectSlug);
      return p ? [{ p, role: x.role }] : [];
    });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!on || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const t = tiltFor({ x: e.clientX, y: e.clientY }, r, 9);
    el.style.setProperty('--rx', `${t.rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${t.rotateY.toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      className={`ccard a-${accentFor(index)} ${flipped ? 'is-flipped' : ''}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="ccard-inner">
        <div className="ccard-face ccard-front" aria-hidden={flipped}>
          <PopScene scene={theme.scene} />
          <FullBody record={member.avatar} />
          <span className="ccard-shine" aria-hidden="true" />
          <a
            className="ccard-link"
            href={link(`/crew/${member.slug}/`)}
            data-cursor="Meet"
            tabIndex={flipped ? -1 : 0}
          >
            <span className="ccard-name">
              <strong>{member.name}</strong>
              <span className="mono">{member.codename || member.role}</span>
            </span>
          </a>
          <span className="ccard-sticker mono">{theme.caption}</span>
        </div>

        <div className="ccard-face ccard-back" aria-hidden={!flipped}>
          <p className="ccard-back-title">{member.name}</p>
          {member.bio && <p className="ccard-bio">{member.bio}</p>}
          <SkillGauges skills={member.skills.slice(0, 5)} className="tubes--card" />
          {works.length > 0 && (
            <p className="ccard-works mono">{works.map(({ p }) => p.name).join(' · ')}</p>
          )}
          <a
            className="ccard-more"
            href={link(`/crew/${member.slug}/`)}
            tabIndex={flipped ? 0 : -1}
          >
            Full profile
          </a>
        </div>
      </div>
      <button
        type="button"
        className="ccard-flip"
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `Turn ${member.name}'s card back over`
            : `Turn ${member.name}'s card over to see skills`
        }
        onClick={() => setFlipped((f) => !f)}
      >
        <span aria-hidden="true">{flipped ? '↺' : 'Flip'}</span>
      </button>
    </div>
  );
}
