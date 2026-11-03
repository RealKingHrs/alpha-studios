import type { StepLinks } from '../nav';

/** Forward and back along the camera path, for touch and mouse. */
export function Controls({ steps, link }: { steps: StepLinks; link: (p: string) => string }) {
  const { back, forward } = steps;
  return (
    <nav className="controls" aria-label="Move through the vault">
      <a
        className="control"
        href={back ? link(back.path) : undefined}
        aria-disabled={!back}
        aria-label={back ? `Back to ${back.label}` : 'Back'}
      >
        Back
      </a>
      <a
        className="control"
        href={forward ? link(forward.path) : undefined}
        aria-disabled={!forward}
        aria-label={forward ? `Forward to ${forward.label}` : 'Forward'}
      >
        Forward
      </a>
    </nav>
  );
}
