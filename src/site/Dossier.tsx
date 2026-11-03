import type { Certification, Snapshot } from '../content/schema';
import type { LinkFn } from './parts';

const SLOTS = 4;

/** Projects a member works on, each with their role on it. */
export function Works({ snap, slug, link }: { snap: Snapshot; slug: string; link: LinkFn }) {
  const rows = snap.memberships
    .filter((x) => x.memberSlug === slug)
    .flatMap((x) => {
      const p = snap.projects.find((q) => q.slug === x.projectSlug);
      return p ? [{ p, role: x.role }] : [];
    });
  if (rows.length === 0) return null;
  return (
    <ul className="dossier-works" aria-label="Works">
      {rows.map(({ p, role }) => (
        <li key={p.slug}>
          <a href={link(`/projects/${p.slug}/`)}>
            <strong>{p.name}</strong>
            <span className="mono">{role || p.status}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const Cup = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
    <path
      d="M14 8h20v12a10 10 0 0 1-20 0z"
      fill="var(--gold)"
      stroke="var(--ink)"
      strokeWidth="2.5"
    />
    <path
      d="M14 12H6c0 7 3 10 8 10M34 12h8c0 7-3 10-8 10"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="2.5"
    />
    <path d="M24 30v8M16 40h16" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** The achievements shelf: earned certificates as trophies, and open slots waiting for the next one. */
export function Shelf({ certs }: { certs: Certification[] }) {
  const empty = Math.max(1, SLOTS - certs.length);
  return (
    <ul className="shelf" aria-label="Achievements">
      {certs.map((c) => (
        <li key={c.id} className="trophy">
          <Cup />
          <strong>{c.title}</strong>
          <span className="mono">
            {[c.issuer, c.issuedOn?.slice(0, 4)].filter(Boolean).join(' · ')}
          </span>
          {c.url && (
            <a href={c.url} rel="noopener noreferrer">
              Credential
            </a>
          )}
        </li>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <li key={`e${i}`} className="trophy is-empty">
          <span className="slot" aria-hidden="true">
            +
          </span>
          <strong>Next unlock</strong>
          <span className="mono">Waiting for a certificate</span>
        </li>
      ))}
    </ul>
  );
}
