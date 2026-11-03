import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, type Theme } from '../../theme';

/** Switches between the dark and light themes. The choice is remembered in this browser only. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    // The head script may already have applied a saved choice before React arrived.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme());
  }, []);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={`fx-theme ${className}`.trim()}
      data-theme-now={theme}
      aria-label={`Switch to the ${next} theme`}
      title={`Switch to the ${next} theme`}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle className="fx-theme-sun" cx="12" cy="12" r="4.2" />
        <g className="fx-theme-rays">
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return (
              <line
                key={k}
                x1={12 + Math.cos(a) * 7.2}
                y1={12 + Math.sin(a) * 7.2}
                x2={12 + Math.cos(a) * 9.4}
                y2={12 + Math.sin(a) * 9.4}
              />
            );
          })}
        </g>
        <path className="fx-theme-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
