import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Cryptex } from '../src/site/Cryptex';
import { PIN_LENGTH } from '../src/ui/pin';

describe('the hidden crew entrance', () => {
  const html = renderToStaticMarkup(
    createElement(Cryptex, { link: (p) => `/alpha-studios${p}`, onClose: () => {} }),
  );

  it('is a labelled dialog with five keyboard wheels', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect((html.match(/role="spinbutton"/g) ?? []).length).toBe(PIN_LENGTH);
  });

  it('has no link to the portal in its markup, and carries no shared secret word', () => {
    expect(html).not.toContain('/portal/');
    expect(html).toContain('Set your PIN');
    expect(html).not.toMatch(/ALPHA/);
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
      expect(page, path || 'home').not.toContain('/portal/app');
      expect(page, path || 'home').not.toMatch(/crew login/i);
    }
  });
});
