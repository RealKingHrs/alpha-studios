import { useRef } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { Portrait } from '../avatar/Portrait';
import { accentFor } from './data';
import { useMotionOn } from './motion/context';
import { tiltFor } from './motion/helpers';
import type { LinkFn } from './parts';

/**
 * An editorial cover card: the member's accent colour, a huge outlined first name behind, and the character
 * standing in front, lifting out of the frame on hover. A call-sign sticker turns in the corner, the project
 * chips rise into view, and the whole card tilts a little toward the pointer. The whole card is one link.
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
  const ref = useRef<HTMLAnchorElement>(null);
  const works = snap.memberships
    .filter((x) => x.memberSlug === member.slug)
    .flatMap((x) => {
      const p = snap.projects.find((q) => q.slug === x.projectSlug);
      return p ? [p.name] : [];
    });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!on || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const t = tiltFor({ x: e.clientX, y: e.clientY }, r, 6);
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

  const first = member.name.split(' ')[0];
  return (
    <a
      ref={ref}
      className={`mcard a-${accentFor(index)}`}
      href={link(`/crew/${member.slug}/`)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="mcard-bg" aria-hidden="true">
        <span className="mcard-word display">{first}</span>
        <span className="mcard-glare" />
      </span>
      <span className="mcard-index mono" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="mcard-art" aria-hidden="true">
        <Portrait record={member.avatar} />
      </span>
      <span className="mcard-panel">
        <span className="mcard-name">
          <strong>{member.name}</strong>
          <span className="mono">{member.codename || member.role}</span>
        </span>
        <span className="mcard-arrow" aria-hidden="true">
          →
        </span>
        {works.length > 0 && (
          <span className="mcard-chips">
            {works.slice(0, 3).map((w) => (
              <i key={w}>{w}</i>
            ))}
          </span>
        )}
      </span>
    </a>
  );
}
