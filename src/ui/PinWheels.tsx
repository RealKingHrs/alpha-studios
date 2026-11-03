import { useRef } from 'react';
import { PIN_LENGTH, turnWheel } from './pin';

/**
 * Five lettered wheels. Click the arrows, scroll over a wheel, or use the arrow keys; typing a character sets
 * the wheel to it. Used on the public site's hidden door and on the portal's sign-in screen.
 */
export function PinWheels({
  value,
  onChange,
  label = 'PIN wheel',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const set = (i: number, letter: string) => onChange(value.map((x, k) => (k === i ? letter : x)));
  const step = (i: number, by: number) => set(i, turnWheel(value[i], by));
  return (
    <div className="cx-wheels">
      {value.slice(0, PIN_LENGTH).map((l, i) => (
        <div key={i} className="cx-wheel">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => step(i, -1)}>
            ▲
          </button>
          <div
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="cx-letter display"
            role="spinbutton"
            tabIndex={0}
            aria-label={`${label} ${i + 1} of ${PIN_LENGTH}`}
            aria-valuemin={0}
            aria-valuemax={31}
            aria-valuenow={0}
            aria-valuetext={l}
            onWheel={(e) => step(i, e.deltaY > 0 ? 1 : -1)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                step(i, -1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                step(i, 1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                refs.current[Math.max(0, i - 1)]?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                refs.current[Math.min(PIN_LENGTH - 1, i + 1)]?.focus();
              } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const c = e.key.toUpperCase();
                if (turnWheel(c, 0) === c) {
                  e.preventDefault();
                  set(i, c);
                  refs.current[Math.min(PIN_LENGTH - 1, i + 1)]?.focus();
                }
              }
            }}
          >
            {l}
          </div>
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => step(i, 1)}>
            ▼
          </button>
        </div>
      ))}
    </div>
  );
}
