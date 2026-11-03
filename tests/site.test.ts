import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Snapshot } from '../src/content/schema';
import { App } from '../src/App';
import {
  ACCENTS,
  ROTATING_WORDS,
  accentFor,
  headlineText,
  initials,
  languageShares,
  marqueeItems,
  stackOrder,
} from '../src/site/data';

const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
const base = '/alpha-studios/';

describe('accents and initials', () => {
  it('gives the same colour to the same position, wrapping round the five accents', () => {
    expect(accentFor(0)).toBe('tomato');
    expect(accentFor(4)).toBe('lilac');
    expect(accentFor(5)).toBe('tomato');
    expect(accentFor(-1)).toBe('lilac');
    expect(ACCENTS).toHaveLength(5);
  });

  it('makes one or two capital letters from a name', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Cher')).toBe('CH');
    expect(initials('  grace  brewster  hopper ')).toBe('GH');
    expect(initials('')).toBe('?');
  });
});

describe('the headline', () => {
  it('reads as one true sentence, with every rotating word in it', () => {
    const text = headlineText();
    expect(text).toBe('Apps for iPhone, Mac and the web.');
    for (const w of ROTATING_WORDS) expect(text).toContain(w);
  });
});

describe('the marquee', () => {
  it('lists each platform and technology once, in order of appearance', () => {
    const items = marqueeItems(snap);
    expect(items.slice(0, 3)).toEqual(['iOS', 'macOS', 'Web']);
    expect(new Set(items.map((x) => x.toLowerCase())).size).toBe(items.length);
    expect(items).toContain('SwiftUI');
    expect(items).toContain('TypeScript');
  });

  it('is empty, not broken, when there is nothing to show', () => {
    expect(marqueeItems({ projects: [] })).toEqual([]);
  });
});

describe('language bar', () => {
  it('turns byte counts into whole percentages that always add up to 100', () => {
    const cases: Array<Record<string, number>> = [
      { Swift: 48210, Shell: 1200 },
      { A: 1, B: 1, C: 1 },
      { A: 10, B: 3, C: 3, D: 1 },
    ];
    for (const langs of cases) {
      const shares = languageShares(langs);
      expect(shares.reduce((n, s) => n + s.percent, 0)).toBe(100);
      expect(shares.every((s) => Number.isInteger(s.percent))).toBe(true);
    }
    expect(languageShares({ Swift: 48210, Shell: 1200 })[0].name).toBe('Swift');
  });

  it('ignores empty languages and returns nothing for an empty repo', () => {
    expect(languageShares({})).toEqual([]);
    expect(languageShares({ A: 0 })).toEqual([]);
  });
});

describe('device stack', () => {
  it('puts the large screen first, then phones, and shows at most three', () => {
    const shots = [
      { src: 'a', alt: '', device: 'iphone' as const },
      { src: 'b', alt: '', device: 'mac' as const },
      { src: 'c', alt: '', device: 'iphone' as const },
      { src: 'd', alt: '', device: 'iphone' as const },
    ];
    const order = stackOrder(shots);
    expect(order).toHaveLength(3);
    expect(order[0].device).toBe('mac');
  });
});

describe('the site', () => {
  it('renders complete, real HTML without any script', () => {
    const html = renderToStaticMarkup(createElement(App, { snap, pathname: base, base }));
    expect(html).toContain('class="site"');
    expect(html).toContain('Apps for iPhone, Mac and the web.');
    expect(html).toContain('href="/alpha-studios/projects/project-one/"');
    expect(html).toContain('href="/alpha-studios/projects/project-two/"');
    expect(html).toContain('Member one');
    expect(html).not.toMatch(/explore|vault|3D/i);
  });

  it('keeps one first-level heading on every address', () => {
    const paths = [
      '',
      'projects/',
      'projects/project-one/',
      'crew/',
      'crew/member-two/',
      'contact/',
      'portal/',
      'nowhere/',
    ];
    for (const path of paths) {
      const html = renderToStaticMarkup(createElement(App, { snap, pathname: base + path, base }));
      expect((html.match(/<h1[ >]/g) ?? []).length, path).toBe(1);
    }
  });

  it('shows no content that depends on animation having run', () => {
    const html = renderToStaticMarkup(createElement(App, { snap, pathname: base + 'crew/', base }));
    expect(html).not.toContain('opacity:0');
    expect(html).toContain('The people behind it');
  });
});
