import { describe, expect, it, vi } from 'vitest';
import { cueForMove } from '../src/audio/cues';
import { createSoundController } from '../src/audio/controller';
import { createSound } from '../src/audio/engine';
import type { Route } from '../src/routes';

const r = (name: Route['name'], slug?: string) => ({ name, ...(slug ? { slug } : {}) }) as Route;

describe('which sound goes with a move', () => {
  it('ticks between places, chimes on opening a room, and is quiet when nothing moved', () => {
    expect(cueForMove(r('home'), r('projects'))).toBe('tick');
    expect(cueForMove(r('projects'), r('project', 'a'))).toBe('tick');
    expect(cueForMove(r('project', 'a'), r('room', 'a'))).toBe('chime');
    expect(cueForMove(r('home'), r('room', 'a'))).toBe('chime');
    expect(cueForMove(r('room', 'a'), r('project', 'a'))).toBe('tick');
    expect(cueForMove(r('home'), r('home'))).toBeNull();
    expect(cueForMove(r('project', 'a'), r('project', 'a'))).toBeNull();
  });
});

function fakeContext() {
  const made = { contexts: 0, oscillators: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  class Ctx {
    state = 'running';
    currentTime = 0;
    destination = {};
    constructor() {
      made.contexts++;
    }
    createGain() {
      return { gain: param(), connect() {} };
    }
    createOscillator() {
      made.oscillators++;
      return { frequency: param(), type: '', connect() {}, start() {}, stop() {} };
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  }
  return { Ctx: Ctx as unknown as new () => AudioContext, made };
}

describe('sound is off until the visitor turns it on', () => {
  it('builds no audio and loads no engine before the first enable', () => {
    const load = vi.fn();
    const c = createSoundController(load);
    c.cue('tick');
    expect(load).not.toHaveBeenCalled();
    expect(c.on).toBe(false);
    expect(c.started).toBe(false);
  });

  it('loads the engine once, only when enabled, and ignores cues while off', async () => {
    const { made } = fakeContext();
    const cue = vi.fn();
    const make = vi.fn(() => ({ setEnabled: vi.fn(), cue, dispose: vi.fn() }));
    const load = vi.fn().mockResolvedValue(make);
    const c = createSoundController(load);
    await c.enable();
    await c.enable();
    expect(load).toHaveBeenCalledTimes(1);
    expect(make).toHaveBeenCalledTimes(1);
    c.cue('chime');
    expect(cue).toHaveBeenCalledWith('chime');
    c.disable();
    c.cue('tick');
    expect(cue).toHaveBeenCalledTimes(1);
    expect(made.contexts).toBe(0);
  });

  it('only creates an audio context when the engine itself is built', () => {
    const { Ctx, made } = fakeContext();
    expect(made.contexts).toBe(0);
    const s = createSound(Ctx);
    expect(made.contexts).toBe(1);
    s.setEnabled(true);
    s.cue('chime');
    s.dispose();
  });

  it('plays nothing at all while the master volume is at zero', () => {
    const { Ctx, made } = fakeContext();
    const s = createSound(Ctx);
    const before = made.oscillators;
    s.cue('chime');
    s.cue('tick');
    expect(made.oscillators).toBe(before);
  });
});
