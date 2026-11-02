import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Snapshot } from '../src/content/schema';
import { allPaths, beatOf, matchRoute } from '../src/routes';
import { bustPlacement, buildStops } from '../src/vault/layout';
import { chooseMode, createFrameMonitor, parseOverrides, type Signals } from '../src/vault/mode';
import {
  clampIndex,
  createWheelStepper,
  poseAt,
  step,
  stopIndexForPath,
  swipeDirection,
} from '../src/vault/path';
import { Tween, cubicBezier, parseBezier } from '../src/vault/tween';
import { hasSeenIntro, markIntroSeen } from '../src/util/storage';

const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
const base = '/alpha-studios/';

describe('routes', () => {
  it('matches the five beats and the detail addresses', () => {
    const m = (p: string) => matchRoute(base + p, base, snap).name;
    expect([m(''), m('projects/'), m('crew/'), m('contact/'), m('portal/')]).toEqual([
      'home',
      'projects',
      'crew',
      'contact',
      'portal',
    ]);
    expect(m('projects/project-one/')).toBe('project');
    expect(m('crew/member-three/')).toBe('member');
    expect(m('crew/nobody/')).toBe('not-found');
  });

  it('gives every address a beat, and every beat an address', () => {
    expect(beatOf(matchRoute(base + 'crew/member-one/', base, snap))).toBe('crew');
    expect(beatOf(matchRoute(base + 'nope', base, snap))).toBeNull();
    expect(allPaths(snap)).toHaveLength(5 + 2 + 5);
  });
});

describe('camera path', () => {
  const stops = buildStops(snap.projects.map((p) => p.slug));

  it('has the five beats in order with a stop in front of each pedestal', () => {
    expect(stops.map((s) => s.path)).toEqual([
      '/',
      '/projects/',
      '/projects/project-one/',
      '/projects/project-two/',
      '/crew/',
      '/contact/',
      '/portal/',
    ]);
    expect(new Set(stops.map((s) => s.beat)).size).toBe(5);
  });

  it('never moves backward (towards +z) from stop to stop', () => {
    const zs = stops.map((s) => s.pose.pos[2]);
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeLessThanOrEqual(zs[i - 1]);
  });

  it('rests exactly on a stop at integer progress and eases between', () => {
    expect(poseAt(stops, 2).pos).toEqual(stops[2].pose.pos);
    const mid = poseAt(stops, 0.5).pos[2];
    expect(mid).toBeLessThan(stops[0].pose.pos[2]);
    expect(mid).toBeGreaterThan(stops[1].pose.pos[2]);
    expect(poseAt(stops, -3).pos).toEqual(stops[0].pose.pos);
    expect(poseAt(stops, 99).pos).toEqual(stops[stops.length - 1].pose.pos);
  });

  it('steps and clamps at the ends, and finds stops by address', () => {
    expect(step(0, -1, 7)).toBe(0);
    expect(step(6, 1, 7)).toBe(6);
    expect(step(2, 1, 7)).toBe(3);
    expect(clampIndex(10, 7)).toBe(6);
    expect(stopIndexForPath(stops, '/crew/')).toBe(4);
    expect(stopIndexForPath(stops, '/nope/')).toBe(-1);
  });

  it('places five busts on an arc around one centre, left to right', () => {
    const b = [0, 1, 2, 3, 4].map((i) => bustPlacement(i, 5));
    const xs = b.map((x) => x.pos[0]);
    expect([...xs].sort((a, c) => a - c)).toEqual(xs);
    const r = b.map((x) => Math.hypot(x.pos[0], x.pos[2] + 30));
    r.forEach((v) => expect(v).toBeCloseTo(8, 5));
  });

  it('releases one wheel step per burst and ignores tiny scrolls', () => {
    const w = createWheelStepper(40, 650);
    expect(w(10, 0)).toBe(0);
    expect(w(40, 10)).toBe(1);
    expect(w(120, 100)).toBe(0);
    expect(w(-120, 800)).toBe(-1);
  });

  it('reads swipe direction: finger up or left goes forward', () => {
    expect(swipeDirection(0, -80)).toBe(1);
    expect(swipeDirection(0, 80)).toBe(-1);
    expect(swipeDirection(-80, 5)).toBe(1);
    expect(swipeDirection(10, 10)).toBe(0);
  });
});

describe('easing', () => {
  it('parses the token curve and falls back safely', () => {
    expect(parseBezier('cubic-bezier(0.22, 0.61, 0.36, 1)')).toEqual([0.22, 0.61, 0.36, 1]);
    expect(parseBezier('nonsense')).toEqual([0.22, 0.61, 0.36, 1]);
  });

  it('runs from 0 to 1 without overshooting (nothing bounces)', () => {
    const e = cubicBezier(0.22, 0.61, 0.36, 1);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
    let prev = 0;
    for (let x = 0.05; x <= 1; x += 0.05) {
      const y = e(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      expect(y).toBeLessThanOrEqual(1);
      prev = y;
    }
  });

  it('tweens, retargets from the current value, and jumps at zero duration', () => {
    const t = new Tween(0, (x) => x);
    t.go(10, 0, 2);
    expect(t.value(1)).toBe(5);
    t.go(0, 1, 1);
    expect(t.value(1.5)).toBeCloseTo(2.5, 5);
    t.go(7, 5, 0);
    expect(t.value(5)).toBe(7);
  });
});

describe('modes', () => {
  const laptop: Signals = {
    webgl: true,
    width: 1440,
    coarsePointer: false,
    deviceMemory: 8,
    cores: 10,
  };

  it('picks full, lite and the plain flow from device signals', () => {
    expect(chooseMode(laptop)).toBe('full');
    expect(chooseMode({ ...laptop, width: 390, coarsePointer: true })).toBe('lite');
    expect(chooseMode({ ...laptop, deviceMemory: 2 })).toBe('lite');
    expect(chooseMode({ ...laptop, saveData: true })).toBe('lite');
    expect(chooseMode({ ...laptop, lowBattery: true })).toBe('lite');
    expect(chooseMode({ ...laptop, webgl: false })).toBe('fallback');
    expect(chooseMode({ ...laptop, override: 'lite' })).toBe('lite');
    expect(chooseMode({ ...laptop, override: 'plain' })).toBe('fallback');
    expect(chooseMode({ ...laptop, webgl: false, override: 'full' })).toBe('fallback');
  });

  it('reads the testing switches', () => {
    expect(parseOverrides('?mode=lite&dev', false)).toEqual({
      mode: 'lite',
      reduceMotion: false,
      dev: true,
    });
    expect(parseOverrides('?motion=reduce', false).reduceMotion).toBe(true);
    expect(parseOverrides('', true).reduceMotion).toBe(true);
    expect(parseOverrides('?mode=bogus', false).mode).toBeUndefined();
  });

  it('switches to lite once when frame rate stays under 30 for two seconds', () => {
    const onSlow = vi.fn();
    const m = createFrameMonitor(onSlow);
    for (let i = 0; i < 600; i++) m.tick(1 / 60);
    expect(onSlow).not.toHaveBeenCalled();
    for (let i = 0; i < 40; i++) m.tick(1 / 20); // 20 fps for 2 s
    expect(onSlow).not.toHaveBeenCalled(); // smoothing is still catching down
    for (let i = 0; i < 120; i++) m.tick(1 / 20);
    expect(onSlow).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 200; i++) m.tick(1 / 20);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('does not trigger on one long frame (background tab) or a brief dip', () => {
    const onSlow = vi.fn();
    const m = createFrameMonitor(onSlow);
    for (let i = 0; i < 100; i++) m.tick(1 / 60);
    m.tick(3);
    for (let i = 0; i < 10; i++) m.tick(1 / 20);
    for (let i = 0; i < 300; i++) m.tick(1 / 60);
    expect(onSlow).not.toHaveBeenCalled();
  });
});

describe('intro memory', () => {
  it('remembers the first visit when storage works', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('never throws when storage is blocked', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
    expect(() => markIntroSeen()).not.toThrow();
    expect(hasSeenIntro()).toBe(false);
    vi.unstubAllGlobals();
  });
});
