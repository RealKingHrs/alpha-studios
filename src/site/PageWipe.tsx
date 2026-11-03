export type WipePhase = 'idle' | 'cover' | 'reveal';

/**
 * A thin accent line along the top that runs while the page changes. The page itself fades and rises
 * (see .page in the stylesheet); this line only tells the eye that something is happening.
 */
export function PageWipe({ phase }: { phase: WipePhase }) {
  return <div className={`page-line page-line--${phase}`} aria-hidden="true" />;
}
