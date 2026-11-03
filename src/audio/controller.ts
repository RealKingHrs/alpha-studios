import { safeGet, safeSet } from '../util/storage';
import type { Cue } from './cues';
import type { Sound } from './engine';

const KEY = 'alpha:sound';

/** What the visitor chose last time. It only says what they want: sound still waits for a gesture. */
export const wantedSound = () => safeGet(KEY) === '1';
export const rememberSound = (on: boolean) => safeSet(KEY, on ? '1' : '0');

/**
 * Owns the sound engine for the page. The engine is loaded and built only the first time sound is
 * switched on, so a visitor who never turns it on downloads and runs none of it.
 */
export function createSoundController(load: () => Promise<() => Sound>) {
  let sound: Sound | null = null;
  let starting: Promise<void> | null = null;
  let on = false;

  return {
    get on() {
      return on;
    },
    get started() {
      return sound !== null;
    },
    /** Call from a click or key press. */
    async enable() {
      on = true;
      if (!sound) {
        starting ??= load().then((make) => {
          sound = make();
        });
        await starting;
      }
      if (on) sound?.setEnabled(true);
    },
    disable() {
      on = false;
      sound?.setEnabled(false);
    },
    cue(c: Cue) {
      if (on) sound?.cue(c);
    },
    dispose() {
      sound?.dispose();
      sound = null;
      starting = null;
      on = false;
    },
  };
}
