import { useRef } from 'react';
import type { Member, Snapshot } from '../content/schema';
import { WavingPortrait } from '../avatar/WavingPortrait';
import { accentFor } from './data';
import { Sticker } from './Mark';
import { useMotionOn } from './motion/context';
import { tiltFor } from './motion/helpers';
import type { LinkFn } from './parts';
import { PopScene } from './PopScene';
import { popTheme } from './popTheme';

const SOCIAL: Array<[keyof Member['links'], string, string]> = [
  ['github', 'GitHub', 'GH'],
  ['linkedin', 'LinkedIn', 'in'],
  ['youtube', 'YouTube', 'YT'],
  ['instagram', 'Instagram', 'IG'],
  ['snapchat', 'Snapchat', 'SC'],
];

/**
 * A full portfolio card. Top: an animated scene built from the member's favourite show, film or game, with the
 * avatar waving in front. Below: name, role, a one-line bio, their strongest skills as filling bars, the projects
 * they work on, trophies and links. It tilts and shifts in layers toward the pointer. The name is the link to the
 * profile, stretched over the card; the small icon links sit above it.
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
  const ref = useRef<HTMLElement>(null);
  const theme = popTheme(member.popPick);
  const works = snap.memberships
    .filter((x) => x.memberSlug === member.slug)
    .flatMap((x) => {
      const p = snap.projects.find((q) => q.slug === x.projectSlug);
      return p ? [p.name] : [];
    });
  const trophies = snap.certifications.filter((c) => c.memberSlug === member.slug).length;
  const top = [...member.skills].sort((a, b) => b.level - a.level).slice(0, 4);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!on || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const t = tiltFor({ x: e.clientX, y: e.clientY }, r, 4);
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty('--rx', `${t.rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${t.rotateY.toFixed(2)}deg`);
    el.style.setProperty('--px', nx.toFixed(3));
    el.style.setProperty('--py', ny.toFixed(3));
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    for (const k of ['--rx', '--ry']) el.style.setProperty(k, '0deg');
    for (const k of ['--px', '--py']) el.style.setProperty(k, '0');
  };

  return (
    <article
      ref={ref}
      className={`mcard a-${accentFor(index)}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="mcard-scene">
        <PopScene scene={theme.scene} />
        <span className="mcard-index mono" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="mcard-avatar">
          <WavingPortrait record={member.avatar} />
        </span>
        <span className="mcard-into mono">
          {member.popPick ? `Into ${member.popPick}` : theme.caption}
        </span>
      </div>

      {member.codename && (
        <Sticker text={member.codename.toUpperCase()} className="mcard-sticker" />
      )}
      <div className="mcard-body">
        <p className="mcard-name">
          <a className="mcard-link" href={link(`/crew/${member.slug}/`)}>
            {member.name}
          </a>
        </p>
        <p className="mcard-role mono">
          {member.role}
          {member.codename ? ` · ${member.codename}` : ''}
        </p>
        {member.bio && <p className="mcard-bio">{member.bio}</p>}

        {top.length > 0 && (
          <ul className="mcard-skills" aria-label={`${member.name}'s top skills`}>
            {top.map((s, i) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <span className="skill-bar" role="img" aria-label={`${s.level} out of 5`}>
                  <i
                    style={
                      {
                        '--w': `${s.level * 20}%`,
                        animationDelay: `${i * 90}ms`,
                      } as React.CSSProperties
                    }
                  />
                </span>
                <b className="mono">{s.level}/5</b>
              </li>
            ))}
          </ul>
        )}

        <div className="mcard-foot">
          {works.length > 0 && (
            <ul className="mcard-chips" aria-label="Works on">
              {works.slice(0, 3).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="mcard-meta">
            {trophies > 0 && (
              <span className="mcard-trophies mono">
                <span aria-hidden="true">★</span> {trophies}{' '}
                {trophies === 1 ? 'certificate' : 'certificates'}
              </span>
            )}
            <span className="mcard-socials">
              {SOCIAL.filter(([k]) => member.links[k]).map(([k, name, glyph]) => (
                <a
                  key={k}
                  href={member.links[k]}
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on ${name}`}
                >
                  {glyph}
                </a>
              ))}
            </span>
          </div>
          <span className="mcard-go" aria-hidden="true">
            View profile <i>→</i>
          </span>
        </div>
      </div>
    </article>
  );
}
