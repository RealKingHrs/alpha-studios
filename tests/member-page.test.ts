import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Snapshot } from '../src/content/schema';
import { App } from '../src/App';

const base = '/alpha-studios/';
const raw = JSON.parse(readFileSync('content/seed/content.json', 'utf8'));
const render = (snap: Snapshot, slug: string) =>
  renderToStaticMarkup(createElement(App, { snap, pathname: `${base}crew/${slug}/`, base }));

describe('member page', () => {
  it('shows name, favourite, works, skills and a next member', () => {
    const snap = Snapshot.parse(raw);
    const html = render(snap, 'aarav-menon');
    expect(html).toContain('Aarav Menon');
    expect(html).toContain('Into Breaking Bad');
    expect(html).toContain('Harbor');
    expect(html).toContain('Toolkit');
    expect(html).toContain('Next crew member');
    expect(html).toContain('href="/alpha-studios/crew/zara-okafor/"');
  });

  it('still renders cleanly for someone with no skills, favourite, links or certificates', () => {
    const bare = structuredClone(raw);
    Object.assign(bare.members[2], { skills: [], popPick: '', links: {}, bio: '', codename: '' });
    bare.certifications = [];
    bare.memberships = bare.memberships.filter(
      (m: { memberSlug: string }) => m.memberSlug !== bare.members[2].slug,
    );
    const snap = Snapshot.parse(bare);
    const html = render(snap, bare.members[2].slug);
    expect(html).toContain(bare.members[2].name);
    expect(html).not.toContain('Toolkit');
    expect(html).toContain('has not added any links yet');
    expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);
  });
});
