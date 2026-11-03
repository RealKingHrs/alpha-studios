import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { Snapshot } from '../src/content/schema';
import { pitchText } from '../src/site/PitchBrief';
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
  it('shows what we make, how we build, the stack and the questions on the home page', () => {
    const home = html();
    for (const id of ['id="make"', 'id="process"', 'id="stack"', 'id="faq"'])
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

  it('keeps the questions on the contact page, and the pitch form on Launchpad only', () => {
    const contact = html('contact/');
    expect(contact).toContain('id="faq"');
    expect(contact).not.toContain('id="pitch"');
    expect(html()).not.toContain('id="pitch"');
    expect(html('launchpad/')).toContain('id="pitch"');
  });

  it('has no dark mode left', () => {
    const home = html();
    expect(home).not.toMatch(/fx-theme|data-theme/);
    expect(readFileSync('design/tokens.css', 'utf8')).not.toContain("data-theme='dark'");
  });
});

describe('the Launchpad pitch', () => {
  const empty = {
    name: '',
    email: '',
    idea: '',
    about: '',
    help: [],
    platforms: [],
    stage: '',
    links: '',
  };

  it('writes a readable email from what was filled in', () => {
    const text = pitchText({
      ...empty,
      name: 'Asha',
      email: 'asha@example.com',
      idea: 'Habit Garden',
      about: 'A habit tracker for students',
      help: ['Design', 'Launch help'],
      platforms: ['iOS'],
      stage: 'Sketches or a prototype',
    });
    expect(text).toContain('Idea name: Habit Garden');
    expect(text).toContain('Help I would like: Design, Launch help');
    expect(text).toContain('asha@example.com');
  });

  it('falls back to plain defaults when the form is empty', () => {
    const text = pitchText(empty);
    expect(text).toContain('(not filled in)');
    expect(text).toContain('Not sure yet');
  });

  it('opens an email to the studio, and never sends a visitor to the sign-in page', () => {
    const page = html('launchpad/');
    expect(page).toContain('mailto:hello@alphastudios.example?subject=Launchpad%20pitch');
    expect(page).not.toContain('portal/app');
    expect(page).toContain('href="#pitch"');
  });

  it('points the other Pitch buttons at the form on Launchpad', () => {
    expect(html('about/')).toContain('href="/alpha-studios/launchpad/#pitch"');
    expect(html('contact/')).toContain('href="/alpha-studios/launchpad/#pitch"');
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

  it('signs in with a PIN and an emailed code only: no password form is left in the portal', () => {
    const login = readFileSync('src/portal/screens/PinLogin.tsx', 'utf8');
    expect(login).toContain('portal-pin');
    expect(login).not.toMatch(/signInWithPassword|signUp|type="password"/);
    expect(html('portal/')).not.toMatch(/Continue with GitHub/);
  });

  it('has a go-live guide and a preflight script', () => {
    expect(readFileSync('docs/GO-LIVE.md', 'utf8')).toContain('portal/app/');
    expect(readFileSync('package.json', 'utf8')).toContain('go-live:check');
  });
});
