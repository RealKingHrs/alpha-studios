import { useRef } from 'react';
import type { Snapshot } from '../content/schema';
import { Portrait } from '../avatar/Portrait';
import { WavingPortrait } from '../avatar/WavingPortrait';
import { Count } from './Counters';
import { accentFor } from './data';
import { Shelf } from './Dossier';
import { Marquee } from './Marquee';
import { Magnetic } from './motion/Magnetic';
import { useMotionOn } from './motion/context';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';
import { popTheme } from './popTheme';
import { Reveal } from './Reveal';
import { SkillRadar } from './SkillRadar';

const SOCIAL: Array<[string, string]> = [
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['snapchat', 'Snapchat'],
];

/**
 * A member's page, built as a story: a full-bleed hero with their favourite-show scene and a waving avatar,
 * a ticker, their bio as a big quote, then a grid of tiles (toolkit, favourite, works, achievements, links)
 * and a panel inviting you on to the next crew member.
 */
export function MemberPage({ snap, slug, link }: { snap: Snapshot; slug: string; link: LinkFn }) {
  const on = useMotionOn();
  const hero = useRef<HTMLElement>(null);

  const index = snap.members.findIndex((m) => m.slug === slug);
  const m = snap.members[index];
  const next = snap.members[(index + 1) % snap.members.length];
  const accent = accentFor(index);
  const theme = popTheme(m.popPick);
  const first = m.name.split(' ')[0];
  const works = snap.memberships
    .filter((x) => x.memberSlug === slug)
    .flatMap((x) => {
      const p = snap.projects.find((q) => q.slug === x.projectSlug);
      return p ? [{ p, role: x.role, accent: accentFor(snap.projects.indexOf(p)) }] : [];
    });
  const certs = snap.certifications.filter((c) => c.memberSlug === slug);
  const socials = SOCIAL.filter(([k]) => (m.links as Record<string, string | undefined>)[k]);
  const ticker = [
    m.role,
    m.codename,
    m.popPick ? `Into ${m.popPick}` : theme.caption,
    `${works.length} ${works.length === 1 ? 'project' : 'projects'}`,
    `${certs.length} ${certs.length === 1 ? 'certificate' : 'certificates'}`,
  ].filter(Boolean);
  const topSkills = [...m.skills].sort((a, b) => b.level - a.level);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = hero.current;
    if (!on || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    el.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
  };

  return (
    <>
      <section
        ref={hero}
        className={`mp-hero a-${accent}`}
        aria-labelledby="pt"
        onPointerMove={onMove}
      >
        <span className="mp-giant display" aria-hidden="true">
          {first}
        </span>
        <div className="s-wrap mp-hero-in">
          <p className="s-eyebrow mono">
            <a href={link('/crew/')}>Crew</a> / {m.role}
          </p>
          <h1 id="pt" className="display mp-name">
            <SplitText text={m.name} />
          </h1>
          {m.codename && <p className="mp-call mono">{m.codename}</p>}
          {(m.location || m.openTo || m.age) && (
            <ul className="mp-meta" aria-label="Where and what for">
              {m.age && <li>Age {m.age}</li>}
              {m.location && <li>{m.location}</li>}
              {m.openTo && <li>Open to: {m.openTo}</li>}
            </ul>
          )}
          <div className="mp-avatar">
            <WavingPortrait record={m.avatar} />
          </div>
          <span className="mp-into mono">{m.popPick ? `Into ${m.popPick}` : theme.caption}</span>
        </div>
        <a className="s-scroll-cue mono" href="#about">
          <span>Scroll</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <Marquee items={ticker} accent="tomato" label={`${m.name} at a glance`} />

      {m.bio && (
        <section id="about" className="mp-about" aria-labelledby="about-title">
          <div className="s-wrap">
            <p id="about-title" className="s-eyebrow mono">
              About {first}
            </p>
            <blockquote className="mp-quote display">
              <SplitText text={m.bio} step={0.035} />
            </blockquote>
          </div>
        </section>
      )}

      <section className="mp-bento s-wrap" aria-label={`${m.name}, in detail`}>
        {m.skills.length > 0 && (
          <Reveal className="mp-tile mp-tile--toolkit">
            <h2 className="mp-h">Toolkit</h2>
            <div className="mp-toolkit">
              <SkillRadar skills={m.skills} />
              <ul className="mp-levels" aria-label="Skills">
                {topSkills.map((s) => (
                  <li key={s.name}>
                    <span>{s.name}</span>
                    <b className="display" aria-label={`${s.level} out of 5`}>
                      <Count to={s.level} />
                      <small>/5</small>
                    </b>
                    <span className="skill-bar" role="img" aria-label={`${s.level} out of 5`}>
                      <i style={{ '--w': `${s.level * 20}%` } as React.CSSProperties} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {m.popPick && (
          <Reveal className={`mp-tile mp-tile--fav a-${accent}`} delay={80}>
            <h2 className="mp-h mp-h--small">Currently into</h2>
            <p className="mp-fav-title display">{m.popPick}</p>
            <p className="mp-fav-cap mono">{theme.caption}</p>
          </Reveal>
        )}

        {(m.experience.length > 0 || m.education.length > 0) && (
          <Reveal className="mp-tile mp-tile--journey" delay={40}>
            <h2 className="mp-h">Journey</h2>
            <ol className="mp-journey">
              {[
                ...m.experience.map((e) => ({
                  kind: 'Work',
                  title: e.title,
                  where: e.org,
                  from: e.from,
                  to: e.to,
                  note: e.note,
                })),
                ...m.education.map((e) => ({
                  kind: 'Study',
                  title: e.field || e.school,
                  where: e.field ? e.school : '',
                  from: e.from,
                  to: e.to,
                  note: '',
                })),
              ].map((j) => (
                <li key={`${j.kind}-${j.title}-${j.from}`}>
                  <span className="mp-j-when mono">
                    {[j.from, j.to].filter(Boolean).join(' – ')}
                  </span>
                  <strong>{j.title}</strong>
                  <span className="mp-j-where">
                    <i className="mono">{j.kind}</i>
                    {j.where}
                  </span>
                  {j.note && <p>{j.note}</p>}
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        {(m.languages.length > 0 || m.interests.length > 0) && (
          <Reveal className="mp-tile mp-tile--more" delay={80}>
            {m.languages.length > 0 && (
              <>
                <h2 className="mp-h mp-h--small">Speaks</h2>
                <ul className="mp-tags">
                  {m.languages.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </>
            )}
            {m.interests.length > 0 && (
              <>
                <h2 className="mp-h mp-h--small">Outside work</h2>
                <ul className="mp-tags">
                  {m.interests.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </>
            )}
          </Reveal>
        )}

        {works.length > 0 && (
          <Reveal className="mp-tile mp-tile--works" delay={40}>
            <h2 className="mp-h">Projects</h2>
            <ul className="mp-works">
              {works.map(({ p, role, accent: pa }, i) => (
                <li key={p.slug} className={`a-${pa}`}>
                  <a href={link(`/projects/${p.slug}/`)}>
                    <span className="mp-work-n display" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="mp-work-body">
                      <strong className="display">{p.name}</strong>
                      <span className="mono">{role || p.status}</span>
                      <span className="mp-work-sum">{p.summary}</span>
                    </span>
                    <span className="mp-work-go" aria-hidden="true">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal className="mp-tile mp-tile--ach" delay={80}>
          <h2 className="mp-h">Achievements</h2>
          <Shelf certs={certs} hrefFor={(c) => link(`/crew/${slug}/certificates/${c.id}/`)} />
        </Reveal>

        <Reveal className="mp-tile mp-tile--connect" delay={120}>
          <h2 className="mp-h">Say hi</h2>
          {socials.length > 0 ? (
            <ul className="mp-socials">
              {socials.map(([k, name]) => (
                <li key={k}>
                  <Magnetic>
                    <a
                      href={(m.links as Record<string, string>)[k]}
                      rel="noopener noreferrer"
                      aria-label={`${m.name} on ${name}`}
                    >
                      {name} <span aria-hidden="true">→</span>
                    </a>
                  </Magnetic>
                </li>
              ))}
            </ul>
          ) : (
            <p>{first} has not added any links yet.</p>
          )}
        </Reveal>
      </section>

      <section className={`mp-next a-${accentFor(index + 1)}`} aria-label="Next crew member">
        <div className="s-wrap mp-next-in">
          <div>
            <p className="s-eyebrow mono">Next up</p>
            <a className="display mp-next-link" href={link(`/crew/${next.slug}/`)}>
              {next.name} <span aria-hidden="true">→</span>
            </a>
            <p className="mp-next-sub">{next.role}</p>
            <p>
              <a className="s-btn s-btn--line" href={link('/crew/')}>
                Back to the crew
              </a>
            </p>
          </div>
          <span className="mp-next-peek" aria-hidden="true">
            <Portrait record={next.avatar} />
          </span>
        </div>
      </section>
    </>
  );
}
