import type { ReactNode } from 'react';
import type { Snapshot } from '../content/schema';
import { BEATS, type Beat } from '../routes';

export type Link = (path: string) => string;

/** Previous and next beat links: also the plain vertical flow when the 3D scene is off. */
function Flow({ beat, link }: { beat: Beat; link: Link }) {
  const i = BEATS.findIndex((b) => b.id === beat);
  const prev = BEATS[i - 1];
  const next = BEATS[i + 1];
  return (
    <nav className="flow" aria-label="Continue the journey">
      {prev && <a href={link(prev.path)}>Back to {prev.label.toLowerCase()}</a>}
      {next && <a href={link(next.path)}>On to {next.label.toLowerCase()}</a>}
    </nav>
  );
}

function Shell({ link, beat, children }: { link: Link; beat?: Beat; children: ReactNode }) {
  return (
    <main className="page" id="main">
      <header>
        <a href={link('/')} className="wordmark">
          Alpha Studios
        </a>
      </header>
      {children}
      {beat && <Flow beat={beat} link={link} />}
      <footer>
        <a href={link('/portal/')} className="quiet">
          Crew login
        </a>
      </footer>
    </main>
  );
}

export function Home({ snap, link }: { snap: Snapshot; link: Link }) {
  return (
    <Shell link={link} beat="entrance">
      <h1>Alpha Studios</h1>
      <p>{snap.settings.studioStatement}</p>
    </Shell>
  );
}

export function Hall({ snap, link }: { snap: Snapshot; link: Link }) {
  return (
    <Shell link={link} beat="projects">
      <h1>Projects</h1>
      <p>Each pedestal holds one project. Select one to see it.</p>
      <ul>
        {snap.projects.map((p) => (
          <li key={p.slug}>
            <a href={link(`/projects/${p.slug}/`)}>{p.name}</a>
            <span className="mono"> {p.status}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function Gallery({ snap, link }: { snap: Snapshot; link: Link }) {
  return (
    <Shell link={link} beat="crew">
      <h1>Crew</h1>
      <p>The people who build at Alpha Studios.</p>
      <ul>
        {snap.members.map((m) => (
          <li key={m.slug}>
            <a href={link(`/crew/${m.slug}/`)}>{m.name}</a>
            <span className="mono"> {m.role}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function Contact({ snap, link }: { snap: Snapshot; link: Link }) {
  const email = snap.settings.contactEmail;
  return (
    <Shell link={link} beat="contact">
      <h1>Get in touch</h1>
      {email ? (
        <p>
          Write to <a href={`mailto:${email}`}>{email}</a>.
        </p>
      ) : (
        <p>Contact details are added with the real content.</p>
      )}
      <p>To join the crew, ask the admin for an invite code, then use the crew login.</p>
    </Shell>
  );
}

export function ProjectPage({ snap, slug, link }: { snap: Snapshot; slug: string; link: Link }) {
  const p = snap.projects.find((x) => x.slug === slug)!;
  const team = snap.memberships
    .filter((m) => m.projectSlug === slug)
    .map((m) => snap.members.find((x) => x.slug === m.memberSlug)!);
  const repo = p.repo ? snap.repos[p.repo] : undefined;
  return (
    <Shell link={link}>
      <h1>{p.name}</h1>
      <p>{p.summary}</p>
      <p className="mono">
        {p.status}, {p.platforms.join(', ')}
      </p>
      {p.tech.length > 0 && <p className="mono">{p.tech.join(', ')}</p>}
      {repo && <p className="mono">{repo.stars} stars</p>}
      <ul>
        {Object.entries(p.links).map(([k, v]) => (
          <li key={k}>
            <a href={v}>{k}</a>
          </li>
        ))}
      </ul>
      <h2>Team</h2>
      <ul>
        {team.map((m) => (
          <li key={m.slug}>
            <a href={link(`/crew/${m.slug}/`)}>{m.name}</a>
          </li>
        ))}
      </ul>
      <nav className="flow" aria-label="Continue the journey">
        <a href={link('/projects/')}>Back to the project hall</a>
      </nav>
    </Shell>
  );
}

export function MemberPage({ snap, slug, link }: { snap: Snapshot; slug: string; link: Link }) {
  const m = snap.members.find((x) => x.slug === slug)!;
  const projects = snap.memberships
    .filter((x) => x.memberSlug === slug)
    .map((x) => snap.projects.find((p) => p.slug === x.projectSlug)!);
  return (
    <Shell link={link}>
      <h1>{m.name}</h1>
      <p className="mono">{m.role}</p>
      <p>{m.bio}</p>
      <ul>
        {Object.entries(m.links).map(([k, v]) => (
          <li key={k}>
            <a href={v}>{k}</a>
          </li>
        ))}
      </ul>
      <h2>Projects</h2>
      <ul>
        {projects.map((p) => (
          <li key={p.slug}>
            <a href={link(`/projects/${p.slug}/`)}>{p.name}</a>
          </li>
        ))}
      </ul>
      <nav className="flow" aria-label="Continue the journey">
        <a href={link('/crew/')}>Back to the crew gallery</a>
      </nav>
    </Shell>
  );
}

export function Portal({ link }: { link: Link }) {
  return (
    <Shell link={link} beat="portal">
      <h1>Crew portal</h1>
      <p>A door for crew and the admin. Sign-in arrives in milestone 5.</p>
    </Shell>
  );
}

export function NotFound({ link }: { link: Link }) {
  return (
    <Shell link={link}>
      <h1>Page not found</h1>
      <p>This address does not lead anywhere in the vault.</p>
      <p>
        <a href={link('/')}>Return to the entrance</a>
      </p>
    </Shell>
  );
}
