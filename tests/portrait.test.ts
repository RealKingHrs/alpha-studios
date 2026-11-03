import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COUNTS, OPTION_KEYS, emptyAvatar } from '../src/avatar/kit';
import { Portrait } from '../src/avatar/Portrait';
import { personalSeed, portraitSignature, portraitSpec } from '../src/avatar/portraitSpec';
import { Snapshot } from '../src/content/schema';

const fixture = JSON.parse(readFileSync('tests/fixtures/avatar-v1.json', 'utf8'));
const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));

describe('the geometric characters', () => {
  it('draw every option the builder can offer, without error', () => {
    for (const key of OPTION_KEYS) {
      for (let v = 0; v < COUNTS[key]; v++) {
        const rec = { version: 1, options: { ...emptyAvatar().options, [key]: v } };
        const svg = renderToStaticMarkup(createElement(Portrait, { record: rec }));
        expect(svg, `${key}=${v}`).toContain('<svg');
        expect(svg, `${key}=${v}`).toContain('portrait-figure');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('undefined');
      }
    }
  });

  it('look different when any single option changes', () => {
    const base = portraitSignature(emptyAvatar());
    for (const key of OPTION_KEYS) {
      if (COUNTS[key] < 2) continue;
      const changed = portraitSignature({
        version: 1,
        options: { ...emptyAvatar().options, [key]: 1 },
      });
      expect(changed.join('|'), key).not.toBe(base.join('|'));
    }
  });

  it('draw the five seed people as five different characters', () => {
    const sigs = snap.members.map((m) => portraitSignature(m.avatar).join('|'));
    expect(new Set(sigs).size).toBe(5);
  });

  it('are deterministic, and the frozen version 1 record still maps to the same drawing', () => {
    expect(portraitSignature(fixture.record)).toEqual(
      portraitSignature(structuredClone(fixture.record)),
    );
    expect(portraitSpec(fixture.record).hair.style).toBe(fixture.spec.hair.style);
    expect(portraitSpec(fixture.record).outfit.color).toBe(fixture.spec.outfit.color);
  });

  it('still draw from a damaged or unknown record', () => {
    for (const bad of [null, 'nonsense', { version: 9, options: { head: 99, hair: -3 } }]) {
      const svg = renderToStaticMarkup(createElement(Portrait, { record: bad }));
      expect(svg).toContain('<svg');
      expect(svg).not.toContain('NaN');
    }
  });

  it('keep the whole drawing in plain SVG: no scripts, no images, no network', () => {
    const svg = renderToStaticMarkup(
      createElement(Portrait, { record: fixture.record, label: 'A crew member' }),
    );
    expect(svg).not.toMatch(/<script|<image|<foreignObject|href="http/i);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="A crew member"');
    const hidden = renderToStaticMarkup(createElement(Portrait, { record: fixture.record }));
    expect(hidden).toContain('aria-hidden="true"');
  });

  it('give each person their own blink timing', () => {
    const seeds = snap.members.map((m) => personalSeed(m.avatar));
    expect(new Set(seeds).size).toBeGreaterThan(2);
    seeds.forEach((n) => expect(n).toBeGreaterThanOrEqual(0));
  });
});
