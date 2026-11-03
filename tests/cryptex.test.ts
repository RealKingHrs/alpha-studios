import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Cryptex, SECRET } from '../src/site/Cryptex';

describe('the hidden crew entrance', () => {
  const html = renderToStaticMarkup(
    createElement(Cryptex, { link: (p) => `/alpha-studios${p}`, onClose: () => {} }),
  );

  it('is a labelled dialog with five keyboard wheels', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect((html.match(/role="spinbutton"/g) ?? []).length).toBe(SECRET.length);
  });

  it('starts locked, with no link to the portal', () => {
    expect(html).not.toContain('/portal/');
    expect(html).not.toContain('Enter the portal');
  });

  it('keeps no visible link to the portal on any public page', async () => {
    const { readFileSync } = await import('node:fs');
    const { Snapshot } = await import('../src/content/schema');
    const { App } = await import('../src/App');
    const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
    for (const path of ['', 'crew/', 'about/', 'contact/', 'launchpad/', 'projects/']) {
      const page = renderToStaticMarkup(
        createElement(App, { snap, pathname: `/alpha-studios/${path}`, base: '/alpha-studios/' }),
      );
      // The only public way into the portal is Launchpad's own pitch button, for newcomers.
      expect(page, path || 'home').not.toMatch(/href="\/alpha-studios\/portal\/app\/(?!#\/pitch)/);
      expect(page, path || 'home').not.toMatch(/crew login/i);
    }
  });
});
