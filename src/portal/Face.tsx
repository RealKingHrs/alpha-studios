import type { CSSProperties } from 'react';
import { Portrait } from '../avatar/Portrait';
import { accentFor } from './messaging';

/** A round avatar: the person's saved portrait on a steady accent colour, with an optional online dot. */
export function Face({
  person,
  size = 44,
  online,
}: {
  person: { id: string; name: string; avatar?: unknown };
  size?: number;
  online?: boolean;
}) {
  return (
    <span
      className="face"
      style={
        { '--face': `${size}px`, '--face-bg': `var(--${accentFor(person.id)})` } as CSSProperties
      }
    >
      <span className="face-clip">
        <Portrait record={person.avatar} />
      </span>
      {online !== undefined && (
        <span className={`face-dot ${online ? 'is-online' : ''}`} aria-hidden="true" />
      )}
    </span>
  );
}
