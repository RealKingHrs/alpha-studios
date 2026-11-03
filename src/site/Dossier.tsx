import type { Certification, Member, Snapshot } from '../content/schema';
import type { LinkFn } from './parts';
import { propRender } from './renders';

const SLOTS = 4;

/** Skill bars: five pips per skill, filled to the member's level. */
export function Skills({ skills }: { skills: Member['skills'] }) {
  if (skills.length === 0) return null;
  return (
    <ul className="dossier-skills" aria-label="Skills">
      {skills.map((s) => (
        <li key={s.name}>
          <span>{s.name}</span>
          <span className="pips" role="img" aria-label={`${s.level} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} className={n <= s.level ? 'on' : ''} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

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

/** The achievements shelf: earned certificates as trophies, and open slots waiting for the next one. */
export function Shelf({ certs, link }: { certs: Certification[]; link: LinkFn }) {
  const empty = Math.max(1, SLOTS - certs.length);
  return (
    <ul className="shelf" aria-label="Achievements">
      {certs.map((c) => (
        <li key={c.id} className="trophy">
          <img
            src={propRender(link, 'trophy')}
            alt=""
            width="56"
            height="56"
            loading="lazy"
            decoding="async"
          />
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

/** Currently, fun fact and pop pick as a short list of labelled lines. */
export function Facts({ member }: { member: Member }) {
  const rows = [
    ['Currently', member.currently],
    ['Fun fact', member.funFact],
    ['Pop pick', member.popPick],
  ].filter(([, v]) => v);
  if (rows.length === 0) return null;
  return (
    <dl className="dossier-facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="mono">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
