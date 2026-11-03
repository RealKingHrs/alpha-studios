import type { Cue } from './cues';

/**
 * All sound is made here with the Web Audio API, so there are no audio files to load or license.
 * Nothing is created until `start()` is called, and that is only ever called from a visitor's own
 * click or key press: browsers block audio before that, and the site is silent by default.
 */
export interface Sound {
  setEnabled(on: boolean): void;
  cue(c: Cue): void;
  dispose(): void;
}

type Ctor = new () => AudioContext;

export function createSound(Context: Ctor): Sound {
  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // A low hum: two sine tones a fifth apart, breathing slowly through a very quiet low-frequency swell.
  const hum = ctx.createGain();
  hum.gain.value = 0.6;
  hum.connect(master);
  for (const f of [55, 82.5]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(hum);
    o.start();
  }
  const swell = ctx.createOscillator();
  const swellDepth = ctx.createGain();
  swell.frequency.value = 0.08;
  swellDepth.gain.value = 0.25;
  swell.connect(swellDepth);
  swellDepth.connect(hum.gain);
  swell.start();

  const blip = (freq: number, to: number, ms: number, level: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + ms / 1000 + 0.05);
  };

  return {
    setEnabled(on) {
      if (on && ctx.state === 'suspended') void ctx.resume();
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(on ? 0.12 : 0, t + 0.6);
    },
    cue(c) {
      if (master.gain.value < 0.001) return;
      if (c === 'tick') return blip(1400, 900, 60, 0.5);
      [523.25, 783.99, 1046.5].forEach((f, i) => blip(f, f * 0.995, 1400 - i * 250, 0.6 / (i + 1)));
    },
    dispose() {
      void ctx.close();
    },
  };
}
