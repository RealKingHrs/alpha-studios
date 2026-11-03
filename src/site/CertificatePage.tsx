import type { Snapshot } from '../content/schema';
import { Sticker } from './Mark';
import { Magnetic } from './motion/Magnetic';
import { SplitText } from './motion/SplitText';
import { accentFor } from './data';
import type { LinkFn } from './parts';
import { Reveal } from './Reveal';

const fmt = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      })
    : '';

/** Whether a certificate is still current, judged on the date the site was published (so the page never changes between server and browser). */
export function certStatus(
  expiresOn: string | null,
  publishedAt: string,
): 'current' | 'expired' | 'none' {
  if (!expiresOn) return 'none';
  return expiresOn >= publishedAt.slice(0, 10) ? 'current' : 'expired';
}

/** A certificate's own page: a framed, certificate-style panel with the details and a link to check it with the issuer. */
export function CertificatePage({
  snap,
  slug,
  id,
  link,
}: {
  snap: Snapshot;
  slug: string;
  id: string;
  link: LinkFn;
}) {
  const c = snap.certifications.find((x) => x.id === id)!;
  const index = snap.members.findIndex((m) => m.slug === slug);
  const m = snap.members[index];
  const status = certStatus(c.expiresOn, snap.generatedAt);
  const others = snap.certifications.filter((x) => x.memberSlug === slug && x.id !== id);
  return (
    <section className={`cert-page a-${accentFor(index)}`} aria-labelledby="pt">
      <div className="s-wrap">
        <p className="s-eyebrow mono">
          <a href={link('/crew/')}>Crew</a> / <a href={link(`/crew/${slug}/`)}>{m.name}</a> /
          Certificate
        </p>
        <div className="cert-frame">
          <span className="cert-corner cert-corner--tl" aria-hidden="true" />
          <span className="cert-corner cert-corner--tr" aria-hidden="true" />
          <span className="cert-corner cert-corner--bl" aria-hidden="true" />
          <span className="cert-corner cert-corner--br" aria-hidden="true" />
          <Sticker text="CERTIFIED · CERTIFIED" className="cert-seal" />
          <p className="mono cert-kicker">Certificate of achievement</p>
          <h1 id="pt" className="display cert-title">
            <SplitText text={c.title} />
          </h1>
          <p className="cert-to">
            Awarded to <strong>{m.name}</strong>
          </p>
          {c.description && <p className="cert-desc">{c.description}</p>}
          <dl className="cert-facts">
            {c.issuer && (
              <div>
                <dt className="mono">Issued by</dt>
                <dd>{c.issuer}</dd>
              </div>
            )}
            {c.issuedOn && (
              <div>
                <dt className="mono">Issued</dt>
                <dd>{fmt(c.issuedOn)}</dd>
              </div>
            )}
            {c.expiresOn && (
              <div>
                <dt className="mono">Expires</dt>
                <dd>
                  {fmt(c.expiresOn)}{' '}
                  <span className={`cert-status cert-status--${status}`}>
                    {status === 'current' ? 'Current' : 'Expired'}
                  </span>
                </dd>
              </div>
            )}
            {c.credentialId && (
              <div>
                <dt className="mono">Credential ID</dt>
                <dd className="mono">{c.credentialId}</dd>
              </div>
            )}
          </dl>
        </div>

        <Reveal className="cert-actions">
          {c.url && (
            <Magnetic>
              <a className="s-btn s-btn--ink" href={c.url} rel="noopener noreferrer">
                Verify with the issuer
              </a>
            </Magnetic>
          )}
          <Magnetic>
            <a className="s-btn s-btn--line" href={link(`/crew/${slug}/`)}>
              Back to {m.name.split(' ')[0]}
            </a>
          </Magnetic>
        </Reveal>
        <p className="cert-note">
          Alpha Studios cannot check this certificate for you. Use the link above to confirm it with
          the issuer.
        </p>

        {others.length > 0 && (
          <>
            <p className="s-eyebrow mono s-space">More from {m.name.split(' ')[0]}</p>
            <ul className="cert-more">
              {others.map((o) => (
                <li key={o.id}>
                  <a href={link(`/crew/${slug}/certificates/${o.id}/`)}>{o.title}</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
