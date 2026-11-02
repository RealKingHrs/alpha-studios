export type Mode = 'full' | 'lite' | 'fallback';

export interface Signals {
  webgl: boolean;
  width: number;
  coarsePointer: boolean;
  deviceMemory?: number;
  cores?: number;
  saveData?: boolean;
  lowBattery?: boolean;
  override?: 'full' | 'lite' | 'plain';
}

/** Decide how much of the vault this device gets. No WebGL means the plain HTML flow. */
export function chooseMode(s: Signals): Mode {
  if (!s.webgl || s.override === 'plain') return 'fallback';
  if (s.override) return s.override;
  const weak =
    (s.deviceMemory !== undefined && s.deviceMemory <= 4) ||
    (s.cores !== undefined && s.cores <= 4) ||
    s.saveData === true ||
    s.lowBattery === true;
  if (s.width < 768 || s.coarsePointer || weak) return 'lite';
  return 'full';
}

export interface Overrides {
  mode?: 'full' | 'lite' | 'plain';
  reduceMotion: boolean;
  dev: boolean;
}

/** Switches: ?mode=lite|full|plain (plain is the 3D-free flow), ?motion=reduce, ?dev. */
export function parseOverrides(search: string, prefersReduced: boolean): Overrides {
  const q = new URLSearchParams(search);
  const mode = q.get('mode');
  return {
    mode: mode === 'lite' || mode === 'full' || mode === 'plain' ? mode : undefined,
    reduceMotion: prefersReduced || q.get('motion') === 'reduce',
    dev: q.has('dev'),
  };
}

export interface FrameMonitor {
  tick(dtSeconds: number): void;
  readonly fps: number;
}

/**
 * Calls onSlow once when the smoothed frame rate stays under `minFps` for `holdSeconds`.
 * Long frames (tab in the background) are ignored so a hidden tab never triggers it.
 */
export function createFrameMonitor(
  onSlow: () => void,
  { minFps = 30, holdSeconds = 2 } = {},
): FrameMonitor {
  let fps = 60;
  let slowFor = 0;
  let fired = false;
  return {
    get fps() {
      return fps;
    },
    tick(dt) {
      if (dt <= 0 || dt > 0.5) return;
      fps += (1 / dt - fps) * 0.1;
      slowFor = fps < minFps ? slowFor + dt : 0;
      if (!fired && slowFor >= holdSeconds) {
        fired = true;
        onSlow();
      }
    },
  };
}
