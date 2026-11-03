import type { Snapshot } from '../content/schema';
import { contributorsWithCrew, platformLabel, projectLinks, statusLabel } from '../rooms';
import { CrewLineup } from './CrewLineup';
import {
  accentFor,
  initials,
  languageShares,
  marqueeItems,
  memberAccent,
  stackOrder,
} from './data';
import { DeviceMock } from './DeviceMock';
import { Mark, Sticker } from './Mark';
import { Marquee } from './Marquee';
import { Hero, SectionHead, WorkPanel, type LinkFn } from './parts';
import { Reveal } from './Reveal';

interface PageProps {
  snap: Snapshot;
  link: LinkFn;
  /** Addresses of files under the site root (screenshots), which do not carry a query string. */
  asset: LinkFn;
  exploreHref: string;
}

const email = (snap: Snapshot) => snap.settings.contactEmail;

function WorkList({ snap, link, asset }: Pick<PageProps, 'snap' | 'link' | 'asset'>) {
  return (
    <div className="s-work-list">
      {snap.projects.map((p, i) => (
        <WorkPanel key={p.slug} project={p} index={i} link={link} assetBase={asset} />
      ))}
    </div>
  );
}

function Hello({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  const mail = email(snap);
  return (
    <section id="contact" className="s-hello s-hello--dark" aria-labelledby="hello-title">
      <div className="s-wrap">
        <Sticker text="SAY HELLO" className="s-hello-sticker" />
        <p className="s-eyebrow mono">
          <span>03</span> Contact
        </p>
        <h2 id="hello-title" className="display s-hello-title">
          Say hello.
        </h2>
        {mail ? (
          <a className="s-hello-mail display" href={`mailto:${mail}`}>
            {mail}
          </a>
        ) : (
          <p className="s-lede">Contact details are added with the real content.</p>
        )}
        <p className="s-lede">
          To join the crew, ask the admin for an invite code, then use the{' '}
          <a href={link('/portal/')}>crew login</a>.
        </p>
      </div>
    </section>
  );
}

export function Home({ snap, link, asset, exploreHref }: PageProps) {
  return (
    <>
      <Hero snap={snap} exploreHref={exploreHref} />
      <Marquee items={marqueeItems(snap)} accent="tomato" label="Platforms and technologies used" />
      <section id="work" className="s-section" aria-labelledby="work-title">
        <div className="s-wrap">
          <SectionHead num="01" eyebrow="Work" title="Selected work" />
          <h2 id="work-title" className="visually-hidden">
            Selected work
          </h2>
        </div>
        <div className="s-wrap s-wrap--wide">
          <WorkList snap={snap} link={link} asset={asset} />
        </div>
      </section>
      <section id="crew" className="s-section s-section--tint" aria-labelledby="crew-title">
        <div className="s-wrap">
          <SectionHead num="02" eyebrow="Crew" title="The people behind it" />
          <h2 id="crew-title" className="visually-hidden">
            The people behind it
          </h2>
          <CrewLineup members={snap.members} link={link} />
        </div>
      </section>
      <Hello snap={snap} link={link} />
    </>
  );
}

export function WorkPage({ snap, link, asset }: PageProps) {
  return (
    <>
      <section className="s-page-head a-sun" aria-labelledby="pt">
        <div className="s-wrap">
          <p className="s-eyebrow mono">Work</p>
          <h1 id="pt" className="display">
            Selected work
          </h1>
          <p className="s-lede">
            Each project has its own case study: the story, the people, the code and where to try
            it.
          </p>
        </div>
      </section>
      <section className="s-section" aria-labelledby="all-work">
        <h2 id="all-work" className="visually-hidden">
          All projects
        </h2>
        <div className="s-wrap s-wrap--wide">
          <WorkList snap={snap} link={link} asset={asset} />
        </div>
      </section>
    </>
  );
}

export function CrewPage({ snap, link }: PageProps) {
  return (
    <>
      <section className="s-page-head a-mint" aria-labelledby="pt">
        <div className="s-wrap">
          <p className="s-eyebrow mono">Crew</p>
          <h1 id="pt" className="display">
            The people behind it
          </h1>
          <p className="s-lede">
            The people who build at Alpha Studios. Select a card for their story and projects.
          </p>
        </div>
      </section>
      <section className="s-section">
        <div className="s-wrap">
          <CrewLineup members={snap.members} link={link} />
        </div>
      </section>
    </>
  );
}

export function ContactPage({ snap, link }: PageProps) {
  const mail = email(snap);
  return (
    <section className="s-hello s-hello--page a-lilac" aria-labelledby="pt">
      <div className="s-wrap">
        <Sticker text="SAY HELLO" className="s-hello-sticker" />
        <p className="s-eyebrow mono">Contact</p>
        <h1 id="pt" className="display s-hello-title">
          Say hello.
        </h1>
        {mail ? (
          <a className="s-hello-mail display" href={`mailto:${mail}`}>
            {mail}
          </a>
        ) : (
          <p className="s-lede">Contact details are added with the real content.</p>
        )}
        <p className="s-lede">
          To join the crew, ask the admin for an invite code, then use the{' '}
          <a href={link('/portal/')}>crew login</a>.
        </p>
      </div>
    </section>
  );
}

export function CaseStudy({ snap, slug, link, asset }: PageProps & { slug: string }) {
  const index = snap.projects.findIndex((p) => p.slug === slug);
  const p = snap.projects[index];
  const accent = accentFor(index);
  const buttons = projectLinks(p);
  const repo = p.repo ? snap.repos[p.repo] : undefined;
  const contributors = repo ? contributorsWithCrew(repo, snap.members) : [];
  const shares = repo ? languageShares(repo.languages) : [];
  const team = snap.memberships
    .filter((m) => m.projectSlug === slug)
    .map((m) => snap.members.find((x) => x.slug === m.memberSlug)!);
  const shots = stackOrder(p.screenshots);
  const next = snap.projects[(index + 1) % snap.projects.length];

  return (
    <>
      <section className={`s-case-hero a-${accent}`} aria-labelledby="pt">
        <div className="s-wrap s-case-grid">
          <div>
            <p className="s-eyebrow mono">
              <a href={link('/projects/')}>Work</a> / Case study{' '}
              {String(index + 1).padStart(2, '0')}
            </p>
            <h1 id="pt" className="display">
              {p.name}
            </h1>
            <p className="s-lede">{p.summary}</p>
            <ul className="s-chips" aria-label="Status and platforms">
              <li className="s-chip s-chip--solid">{statusLabel[p.status]}</li>
              {p.platforms.map((x) => (
                <li key={x} className="s-chip">
                  {platformLabel[x]}
                </li>
              ))}
            </ul>
            {buttons.length > 0 && (
              <p className="s-actions">
                {buttons.map((b, i) => (
                  <a
                    key={b.key}
                    className={`s-btn ${i === 0 ? 's-btn--ink' : 's-btn--line'}`}
                    href={b.href}
                    rel="noopener noreferrer"
                  >
                    {b.label}
                  </a>
                ))}
              </p>
            )}
          </div>
          <div className="s-work-stage s-work-stage--case">
            {shots.map((s, i) => (
              <DeviceMock
                key={s.src}
                shot={s}
                src={asset(`/${s.src}`)}
                label={p.name}
                className={`d${i}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="s-section" aria-labelledby="story-title">
        <div className="s-wrap s-case-body">
          <div>
            <p className="s-eyebrow mono">The story</p>
            <h2 id="story-title" className="visually-hidden">
              The story
            </h2>
            <p className="s-story display">{p.story || p.summary}</p>
          </div>
          <aside aria-label="Built with">
            <p className="s-eyebrow mono">Built with</p>
            <ul className="s-chips">
              {p.tech.map((t) => (
                <li key={t} className="s-chip">
                  {t}
                </li>
              ))}
            </ul>
            <p className="s-eyebrow mono s-space">Team</p>
            <ul className="s-team">
              {team.map((m) => (
                <li key={m.slug}>
                  <a href={link(`/crew/${m.slug}/`)}>
                    <span
                      className={`s-avatar a-${memberAccent(snap.members, m.slug)}`}
                      aria-hidden="true"
                    >
                      {initials(m.name)}
                    </span>
                    <span>
                      {m.name}
                      <small className="mono">{m.role}</small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {repo && (
        <section className="s-section s-section--tint" aria-labelledby="gh-title">
          <div className="s-wrap">
            <p className="s-eyebrow mono">In the open</p>
            <h2 id="gh-title" className="display s-h2">
              On GitHub
            </h2>
            <div className="s-stats">
              <Reveal className="s-stat a-sun">
                <strong className="display">{repo.stars}</strong>
                <span className="mono">stars</span>
              </Reveal>
              <Reveal className="s-stat a-sky" delay={80}>
                <strong className="display">{repo.recentCommits.length}</strong>
                <span className="mono">recent commits</span>
              </Reveal>
              <Reveal className="s-stat a-mint" delay={160}>
                <strong className="display">{repo.contributors.length}</strong>
                <span className="mono">contributors</span>
              </Reveal>
            </div>
            {shares.length > 0 && (
              <div className="s-langs">
                <div
                  className="s-langbar"
                  role="img"
                  aria-label={`Languages: ${shares.map((l) => `${l.name} ${l.percent}%`).join(', ')}`}
                >
                  {shares.map((l, i) => (
                    <span
                      key={l.name}
                      className={`a-${accentFor(i + 1)}`}
                      style={{ width: `${l.percent}%` }}
                    />
                  ))}
                </div>
                <ul className="s-legend mono" aria-hidden="true">
                  {shares.map((l) => (
                    <li key={l.name}>
                      {l.name} {l.percent}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="s-commits">
              <ul>
                {repo.recentCommits.map((c) => (
                  <li key={c.sha}>
                    <span className="mono">{c.sha}</span> {c.message}{' '}
                    <span className="mono s-quiet">{c.author}</span>
                  </li>
                ))}
              </ul>
              <p className="s-lede">
                Contributors:{' '}
                {contributors.map((c, i) => (
                  <span key={c.login}>
                    {i > 0 && ', '}
                    {c.member ? (
                      <a href={link(`/crew/${c.member.slug}/`)}>{c.member.name}</a>
                    ) : (
                      c.login
                    )}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="s-next" aria-label="Next case study">
        <div className="s-wrap">
          <p className="s-eyebrow mono">Next</p>
          <a className="display s-next-link" href={link(`/projects/${next.slug}/`)}>
            {next.name} <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </>
  );
}

export function CrewProfile({ snap, slug, link }: PageProps & { slug: string }) {
  const index = snap.members.findIndex((m) => m.slug === slug);
  const m = snap.members[index];
  const projects = snap.memberships
    .filter((x) => x.memberSlug === slug)
    .map((x) => snap.projects.find((p) => p.slug === x.projectSlug)!);
  return (
    <section className={`s-profile a-${accentFor(index)}`} aria-labelledby="pt">
      <div className="s-wrap s-profile-grid">
        <div className="s-profile-art">
          <CrewLineup members={[m]} link={link} profile />
        </div>
        <div>
          <p className="s-eyebrow mono">
            <a href={link('/crew/')}>Crew</a> / {m.role}
          </p>
          <h1 id="pt" className="display">
            {m.name}
          </h1>
          <p className="s-lede">{m.bio}</p>
          {Object.keys(m.links).length > 0 && (
            <ul className="s-links" aria-label="Links">
              {Object.entries(m.links).map(([k, v]) => (
                <li key={k}>
                  <a className="s-btn s-btn--line" href={v} rel="noopener noreferrer">
                    {k[0].toUpperCase() + k.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {projects.length > 0 && (
            <>
              <p className="s-eyebrow mono s-space">Works on</p>
              <ul className="s-chips">
                {projects.map((p) => (
                  <li key={p.slug}>
                    <a className="s-chip s-chip--solid" href={link(`/projects/${p.slug}/`)}>
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function PortalDoor({ link }: { link: LinkFn }) {
  return (
    <section className="s-hello s-hello--page a-sky" aria-labelledby="pt">
      <div className="s-wrap">
        <p className="s-eyebrow mono">Crew only</p>
        <h1 id="pt" className="display s-hello-title">
          Crew login
        </h1>
        <p className="s-lede">
          A door for the crew and the admin to keep their profiles and projects up to date.
        </p>
        <p className="s-actions">
          <a className="s-btn s-btn--ink" href={`${link('/portal/app/')}`}>
            Open the portal
          </a>
        </p>
      </div>
    </section>
  );
}

export function NotFoundPage({ link }: { link: LinkFn }) {
  return (
    <section className="s-hello s-hello--page a-tomato s-lost" aria-labelledby="pt">
      <div className="s-wrap">
        <Sticker text="404 · LOST · 404 · LOST" className="s-lost-sticker" />
        <h1 id="pt" className="display s-hello-title">
          This page wandered off.
        </h1>
        <p className="s-lede">
          This address does not lead anywhere on the site. It may have moved, or the link may have a
          typo.
        </p>
        <p className="s-actions">
          <a className="s-btn s-btn--ink" href={link('/')}>
            Back to the start
          </a>
          <a className="s-btn s-btn--line" href={link('/projects/')}>
            See the work
          </a>
        </p>
        <Mark className="s-lost-mark" />
      </div>
    </section>
  );
}
