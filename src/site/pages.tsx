import type { Snapshot } from '../content/schema';
import { Portrait } from '../avatar/Portrait';
import { contributorsWithCrew, platformLabel, projectLinks, statusLabel } from '../rooms';
import { Counters } from './Counters';
import { MemberPage } from './MemberPage';
import { Elements } from './Elements';
import { CrewLineup } from './CrewLineup';
import { accentFor, languageShares, marqueeItems, memberAccent, stackOrder } from './data';
import { Mark, Sticker } from './Mark';
import { Marquee } from './Marquee';
import { Magnetic } from './motion/Magnetic';
import { SplitText } from './motion/SplitText';
import { Hero, SectionHead, WorkList, type LinkFn } from './parts';
import { Reveal } from './Reveal';
import { WorkStage } from './WorkStage';

interface PageProps {
  snap: Snapshot;
  link: LinkFn;
  /** Addresses of files under the site root (screenshots). */
  asset: LinkFn;
}

/** The titles of the home page's sections, in order, for the running index. */
export const HOME_SECTIONS = ['Work', 'Crew', 'Contact'];

function Hello({
  snap,
  link,
  page = false,
  accent,
}: {
  snap: Snapshot;
  link: LinkFn;
  page?: boolean;
  accent?: string;
}) {
  const mail = snap.settings.contactEmail;
  const Title = page ? 'h1' : 'h2';
  return (
    <section
      id="contact"
      data-section
      className={`s-hello ${page ? `s-hello--page a-${accent}` : 's-hello--dark'}`}
      aria-labelledby="hello-title"
    >
      <div className="s-wrap">
        <Sticker text="SAY HELLO" className="s-hello-sticker" />
        {page && (
          <svg className="s-envelope" viewBox="0 0 120 90" aria-hidden="true">
            <rect
              x="6"
              y="14"
              width="108"
              height="70"
              rx="8"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="4"
            />
            <path
              className="s-envelope-flap"
              d="M 8 18 L 60 56 L 112 18"
              fill="var(--sun)"
              stroke="var(--ink)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 8 82 L 46 48 M 112 82 L 74 48"
              stroke="var(--ink)"
              strokeWidth="3"
              fill="none"
            />
          </svg>
        )}
        <Reveal>
          <p className="s-eyebrow mono">
            {page ? (
              'Contact'
            ) : (
              <>
                <span>03</span> Contact
              </>
            )}
          </p>
        </Reveal>
        <Title id="hello-title" className="display s-hello-title">
          <SplitText text="Say hello." />
        </Title>
        {mail ? (
          <Magnetic strength={0.5}>
            <a className="s-hello-mail display" href={`mailto:${mail}`}>
              {mail}
            </a>
          </Magnetic>
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

export function Home({ snap, link, asset }: PageProps) {
  return (
    <>
      <Hero snap={snap} />
      <Marquee items={marqueeItems(snap)} accent="tomato" label="Platforms and technologies used" />
      <Counters snap={snap} />
      <section id="work" data-section className="s-section" aria-labelledby="work-title">
        <div className="s-wrap">
          <SectionHead num="01" eyebrow="Work" title="Selected work" id="work-title" />
        </div>
        <div className="s-wrap s-wrap--wide">
          <WorkList snap={snap} link={link} asset={asset} />
        </div>
      </section>
      <section
        id="crew"
        data-section
        className="s-section s-section--tint"
        aria-labelledby="crew-title"
      >
        <div className="s-wrap">
          <SectionHead num="02" eyebrow="Crew" title="The people behind it" id="crew-title" />
          <CrewLineup members={snap.members} link={link} snap={snap} />
        </div>
      </section>
      <Hello snap={snap} link={link} />
    </>
  );
}

function PageHead({
  accent,
  eyebrow,
  title,
  lede,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <section className={`s-page-head a-${accent}`} aria-labelledby="pt">
      <div className="s-wrap">
        <Reveal>
          <p className="s-eyebrow mono">{eyebrow}</p>
        </Reveal>
        <h1 id="pt" className="display">
          <SplitText text={title} />
        </h1>
        <Reveal delay={150}>
          <p className="s-lede">{lede}</p>
        </Reveal>
      </div>
    </section>
  );
}

export function WorkPage({ snap, link, asset }: PageProps) {
  return (
    <>
      <PageHead
        accent="sun"
        eyebrow="Work"
        title="Selected work"
        lede="Each project has its own case study: the story, the people, the code and where to try it."
      />
      <section className="s-section" aria-labelledby="all-work">
        <h2 id="all-work" className="visually-hidden">
          All projects
        </h2>
        <div className="s-wrap s-wrap--wide">
          <WorkList snap={snap} link={link} asset={asset} />
        </div>
      </section>
      <Elements snap={snap} />
    </>
  );
}

export function CrewPage({ snap, link }: PageProps) {
  return (
    <>
      <PageHead
        accent="mint"
        eyebrow="Crew"
        title="The people behind it"
        lede="The people who build at Alpha Studios. Select a card for their story and projects."
      />
      <section className="s-section">
        <div className="s-wrap">
          <CrewLineup members={snap.members} link={link} snap={snap} />
        </div>
      </section>
    </>
  );
}

export function ContactPage({ snap, link }: PageProps) {
  return <Hello snap={snap} link={link} page accent="lilac" />;
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
              <SplitText text={p.name} />
            </h1>
            <Reveal delay={120}>
              <p className="s-lede">{p.summary}</p>
              {p.origin === 'launchpad' && (
                <p className="founder-credit mono">
                  Founded by {p.founderName} · Owned and supported by Alpha Studios
                </p>
              )}
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
                    <Magnetic key={b.key}>
                      <a
                        className={`s-btn ${i === 0 ? 's-btn--ink' : 's-btn--line'}`}
                        href={b.href}
                        rel="noopener noreferrer"
                      >
                        {b.label}
                      </a>
                    </Magnetic>
                  ))}
                </p>
              )}
            </Reveal>
          </div>
          <WorkStage shots={shots} name={p.name} asset={asset} className="s-work-stage--case" />
        </div>
      </section>

      <section className="s-facts" aria-label="At a glance">
        <dl className="s-wrap">
          <div>
            <dt className="mono">Status</dt>
            <dd>{statusLabel[p.status]}</dd>
          </div>
          <div>
            <dt className="mono">Platforms</dt>
            <dd>{p.platforms.map((x) => platformLabel[x]).join(', ') || 'To be announced'}</dd>
          </div>
          <div>
            <dt className="mono">Built with</dt>
            <dd>
              {p.tech.length} {p.tech.length === 1 ? 'technology' : 'technologies'}
            </dd>
          </div>
          <div>
            <dt className="mono">Team</dt>
            <dd>
              {team.length} {team.length === 1 ? 'person' : 'people'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="s-section" aria-labelledby="story-title">
        <div className="s-wrap s-case-body">
          <div>
            <p className="s-eyebrow mono">The story</p>
            <h2 id="story-title" className="visually-hidden">
              The story
            </h2>
            <Reveal>
              <p className="s-story display">{p.story || p.summary}</p>
            </Reveal>
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
                      <Portrait record={m.avatar} />
                    </span>
                    <span>
                      {m.name}
                      <small className="mono">
                        {snap.memberships.find(
                          (x) => x.projectSlug === slug && x.memberSlug === m.slug,
                        )?.role || m.role}
                      </small>
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
              <SplitText text="On GitHub" />
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

      <section
        className={`s-next a-${accentFor((index + 1) % snap.projects.length)}`}
        aria-label="Next case study"
      >
        <div className="s-wrap">
          <p className="s-eyebrow mono">Up next</p>
          <a className="display s-next-link" href={link(`/projects/${next.slug}/`)}>
            {next.name} <span aria-hidden="true">→</span>
          </a>
          <p className="s-next-sum">{next.summary}</p>
        </div>
      </section>
    </>
  );
}

export function CrewProfile({ snap, slug, link }: PageProps & { slug: string }) {
  return <MemberPage snap={snap} slug={slug} link={link} />;
}

export function PortalDoor({ link }: { link: LinkFn }) {
  return (
    <section className="s-hello s-hello--page a-sky" aria-labelledby="pt">
      <div className="s-wrap">
        <p className="s-eyebrow mono">Crew only</p>
        <h1 id="pt" className="display s-hello-title">
          <SplitText text="Crew login" />
        </h1>
        <p className="s-lede">
          A door for the crew and the admin to keep their profiles and projects up to date.
        </p>
        <p className="s-actions">
          <Magnetic>
            <a className="s-btn s-btn--ink" href={link('/portal/app/')}>
              Open the portal
            </a>
          </Magnetic>
        </p>
      </div>
    </section>
  );
}

export function NotFoundPage({ link }: { link: LinkFn }) {
  return (
    <section className="s-hello s-hello--page a-tomato s-lost" aria-labelledby="pt">
      <div className="s-wrap">
        <div className="lp-floats" aria-hidden="true">
          {(['circle', 'square', 'pill', 'ring', 'dot'] as const).map((k, i) => (
            <span
              key={k}
              className={`lp-float lp-float--${k} a-${['sun', 'sky', 'mint', 'lilac', 'sun'][i]}`}
            />
          ))}
        </div>
        <Sticker text="404 · LOST · 404 · LOST" className="s-lost-sticker" />
        <h1 id="pt" className="display s-hello-title">
          <SplitText text="This page wandered off." />
        </h1>
        <p className="s-lede">
          This address does not lead anywhere on the site. It may have moved, or the link may have a
          typo.
        </p>
        <p className="s-actions">
          <Magnetic>
            <a className="s-btn s-btn--ink" href={link('/')}>
              Back to the start
            </a>
          </Magnetic>
          <Magnetic>
            <a className="s-btn s-btn--line" href={link('/projects/')}>
              See the work
            </a>
          </Magnetic>
        </p>
        <Mark className="s-lost-mark" />
      </div>
    </section>
  );
}
