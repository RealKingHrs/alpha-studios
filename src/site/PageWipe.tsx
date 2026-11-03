export type WipePhase = 'idle' | 'cover' | 'reveal';

/**
 * Changing page: one solid colour block sweeps up over the old page, the new page is swapped in underneath,
 * and the block carries on up and away. The colour follows the page you are going to.
 */
export function PageWipe({ phase, accent }: { phase: WipePhase; accent: string }) {
  return (
    <div
      className={`page-wipe page-wipe--${phase}`}
      style={{ background: `var(--${accent})` }}
      aria-hidden="true"
    />
  );
}
