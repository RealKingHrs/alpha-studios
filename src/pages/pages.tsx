import type { ReactNode } from 'react';
import type { Snapshot } from '../content/schema';

type Link = (path: string) => string;

function Shell({ link, children }: { link: Link; children: ReactNode }) {
  return (
    <main className="page">
      <header>
        <a href={link('/')} className="wordmark">
          Alpha Studios
        </a>
      </header>
      {children}
    </main>
  );
}

export function Home({ snap, link }: { snap: Snapshot; link: Link }) {
  return (
    <Shell link={link}>
      <h1>Alpha Studios</h1>
      <p>{snap.settings.studioStatement}</p>
      <h2>Projects</h2>
      <ul>
        {snap.projects.map((p) => (
          <li key={p.slug}>
            <a href={link(`/projects/${p.slug}/`)}>{p.name}</a>
          </li>
        ))}
      </ul>
      <h2>Crew</h2>
      <ul>
        {snap.members.map((m) => (
          <li key={m.slug}>
            <a href={link(`/crew/${m.slug}/`)}>{m.name}</a>, {m.role}
          </li>
        ))}
      </ul>
      <p>
        <a href={link('/portal/')}>Crew login</a>
      </p>
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
    </Shell>
  );
}

export function Portal({ link }: { link: Link }) {
  return (
    <Shell link={link}>
      <h1>Crew portal</h1>
      <p>Sign-in arrives in milestone 5.</p>
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
