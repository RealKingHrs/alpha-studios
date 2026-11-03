import { describe, expect, it } from 'vitest';
import { FullBody } from '../src/avatar/FullBody';
import { COUNTS, OPTION_KEYS } from '../src/avatar/kit';
import { popTheme } from '../src/site/popTheme';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('pop themes', () => {
  it.each([
    ['Breaking Bad', 'lab'],
    ['money heist', 'heist'],
    ['Minecraft', 'blocks'],
    ['GTA VI', 'city'],
    ['Pulp Fiction', 'diner'],
    ['Bluey', 'stars'],
    ['', 'stars'],
  ])('%s gives the %s scene', (pick, scene) => {
    expect(popTheme(pick).scene).toBe(scene);
  });

  it('copes with missing answers', () => {
    expect(popTheme(undefined).scene).toBe('stars');
    expect(popTheme(null).caption.length).toBeGreaterThan(0);
  });
});

describe('full-body character', () => {
  it('draws for every option of every kind, and for damaged records', () => {
    for (const key of OPTION_KEYS) {
      for (let i = 0; i < COUNTS[key]; i++) {
        const html = renderToStaticMarkup(
          createElement(FullBody, { record: { version: 1, options: { [key]: i } } }),
        );
        expect(html).toContain('fb-arm');
        expect(html).toContain('fb-leg');
      }
    }
    expect(renderToStaticMarkup(createElement(FullBody, { record: null }))).toContain('fullbody');
  });
});
