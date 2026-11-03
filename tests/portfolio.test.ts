import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { briefText } from '../src/site/Brief';
import { Barcode } from '../src/site/fx/Barcode';
import { FAQ } from '../src/site/Faq';
import { HEADLINE, HEADLINE_LOOP } from '../src/site/data';

const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
const base = '/alpha-studios/';
const html = (path = '') =>
  renderToStaticMarkup(createElement(App, { snap, pathname: base + path, base }));

describe('the catchphrase', () => {
  it('starts on the real sentence, so the page and reduced motion both read it whole', () => {
    expect(HEADLINE_LOOP[0]).toBe(HEADLINE[1]);
    expect(html()).toContain('We build software people rely on.');
  });

  it('says APIs, not backends, on the cover', () => {
    const home = html();
    expect(home).toContain('Native apps · Web platforms · APIs');
    expect(home).not.toMatch(/Web platforms · Backends/);
  });
});

describe('the portfolio sections', () => {
  it('shows what we make, how we build, the stack, questions and the brief on the home page', () => {
    const home = html();
    for (const id of ['id="make"', 'id="process"', 'id="stack"', 'id="faq"', 'id="brief"'])
      expect(home, id).toContain(id);
    expect(home).toContain('Native iOS apps');
    expect(home).toContain('Four steps, no surprises.');
  });

  it('links each service to the drops that use it', () => {
    const home = html();
    expect(home).toContain('href="/alpha-studios/projects/bioscanner/"');
    expect(home).toContain('href="/alpha-studios/projects/velocity/"');
  });

  it('keeps every FAQ answer in the page, collapsed until opened', () => {
    const home = html();
    for (const [q] of FAQ) expect(home).toContain(q);
    expect(home).toContain('aria-expanded');
  });

  it('puts the brief and the questions on the contact page too', () => {
    const contact = html('contact/');
    expect(contact).toContain('id="brief"');
    expect(contact).toContain('id="faq"');
  });

  it('has no dark mode left', () => {
    const home = html();
    expect(home).not.toMatch(/fx-theme|data-theme/);
    expect(readFileSync('design/tokens.css', 'utf8')).not.toContain("data-theme='dark'");
  });
});

describe('the project brief', () => {
  it('writes a readable email from what was filled in', () => {
    const text = briefText({
      name: 'Asha',
      email: 'asha@example.com',
      about: 'A habit tracker',
      platforms: ['iOS', 'Web'],
      range: '2k to 10k',
      when: 'This month',
    });
    expect(text).toContain('What I am building: A habit tracker');
    expect(text).toContain('Platforms: iOS, Web');
    expect(text).toContain('Budget range: 2k to 10k');
    expect(text).toContain('asha@example.com');
  });

  it('falls back to plain defaults when the form is empty, and never crashes', () => {
    const text = briefText({ name: '', email: '', about: '', platforms: [], range: '', when: '' });
    expect(text).toContain('(not filled in)');
    expect(text).toContain('Not sure yet');
  });

  it('builds a mailto link to the studio address, with the text encoded', () => {
    const page = html('contact/');
    expect(page).toContain('mailto:hello@alphastudios.example?subject=Project%20brief');
  });
});

describe('version 1 touches', () => {
  it('has the rubber stamp, the new sticker and the barcode on the home page', () => {
    const home = html();
    expect(home).toContain('fx-stamp');
    expect(home).toContain('fx-burst');
    expect(home).toContain('fx-barcode');
  });

  it('no longer draws the outlined ring or the yellow circle behind the cover', () => {
    const home = html();
    expect(home).not.toContain('fx-shape--ring');
    expect(home).not.toContain('fx-shape--circle');
  });

  it('keeps the cursor solid: no blend mode that inverts the page underneath it', () => {
    const css = readFileSync('src/styles/core.css', 'utf8');
    const cursor = css.slice(css.indexOf('.cursor {'), css.indexOf('changing page'));
    expect(cursor).not.toMatch(/mix-blend-mode/);
  });

  it('draws the same barcode every time for the same word', () => {
    const a = renderToStaticMarkup(createElement(Barcode, { code: 'ALPHA' }));
    const b = renderToStaticMarkup(createElement(Barcode, { code: 'ALPHA' }));
    expect(a).toBe(b);
    expect(a).toContain('<rect');
  });

  it('hides the portal GitHub button unless it is switched on', () => {
    expect(html('portal/')).not.toMatch(/Continue with GitHub/);
    expect(readFileSync('src/portal/screens/Login.tsx', 'utf8')).toContain('VITE_PORTAL_GITHUB');
  });

  it('has a go-live guide and a preflight script', () => {
    expect(readFileSync('docs/GO-LIVE.md', 'utf8')).toContain('portal/app/');
    expect(readFileSync('package.json', 'utf8')).toContain('go-live:check');
  });
});
