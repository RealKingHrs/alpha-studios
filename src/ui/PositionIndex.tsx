import { BEATS, type Beat } from '../routes';

/** Corner index of the five beats. Real links, so it works with and without the 3D scene. */
export function PositionIndex({
  current,
  link,
}: {
  current: Beat | null;
  link: (p: string) => string;
}) {
  return (
    <nav className="index" aria-label="Places in the vault">
      <ol>
        {BEATS.map((b, i) => (
          <li key={b.id}>
            <a href={link(b.path)} aria-current={b.id === current ? 'location' : undefined}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="index-label">{b.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
