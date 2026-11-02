import { BEATS, type Beat } from '../routes';

/** Forward and back through the five beats, for touch and mouse. */
export function Controls({ current, link }: { current: Beat | null; link: (p: string) => string }) {
  const i = BEATS.findIndex((b) => b.id === current);
  const prev = i > 0 ? BEATS[i - 1] : null;
  const next = i >= 0 && i < BEATS.length - 1 ? BEATS[i + 1] : null;
  return (
    <div className="controls">
      <a
        className="control"
        href={prev ? link(prev.path) : undefined}
        aria-disabled={!prev}
        aria-label={prev ? `Back to ${prev.label.toLowerCase()}` : 'Back'}
      >
        Back
      </a>
      <a
        className="control"
        href={next ? link(next.path) : undefined}
        aria-disabled={!next}
        aria-label={next ? `Forward to ${next.label.toLowerCase()}` : 'Forward'}
      >
        Forward
      </a>
    </div>
  );
}
