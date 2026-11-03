import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Snapshot } from '../src/content/schema';
import { App } from '../src/App';
import { pageMeta } from '../src/meta';
import { allPaths, matchRoute } from '../src/routes';
import { certStatus } from '../src/site/CertificatePage';

const base = '/alpha-studios/';
const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));

describe('certificate pages', () => {
  const c = snap.certifications[0];
  const path = `/crew/${c.memberSlug}/certificates/${c.id}/`;

  it('has an address for every certificate, and refuses a wrong member or unknown id', () => {
    expect(allPaths(snap)).toContain(path);
    expect(matchRoute(base + path.slice(1), base, snap)).toMatchObject({
      name: 'certificate',
      id: c.id,
    });
    expect(matchRoute(`${base}crew/riya-suresh/certificates/${c.id}/`, base, snap).name).toBe(
      'not-found',
    );
    expect(matchRoute(`${base}crew/${c.memberSlug}/certificates/nope/`, base, snap).name).toBe(
      'not-found',
    );
  });

  it('has its own title and description', () => {
    const meta = pageMeta(base + path.slice(1), base, snap);
    expect(meta.title).toContain(c.title);
    expect(meta.description).toContain(c.issuer);
  });

  it('shows the details, a verify link and the honest note', () => {
    const html = renderToStaticMarkup(
      createElement(App, { snap, pathname: base + path.slice(1), base }),
    );
    expect(html).toContain(c.title);
    expect(html).toContain('Verify with the issuer');
    expect(html).toContain('cannot check this certificate');
    expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);
  });

  it('judges status from the publish date', () => {
    expect(certStatus(null, '2026-11-03T00:00:00Z')).toBe('none');
    expect(certStatus('2027-01-01', '2026-11-03T00:00:00Z')).toBe('current');
    expect(certStatus('2026-01-01', '2026-11-03T00:00:00Z')).toBe('expired');
  });
});
