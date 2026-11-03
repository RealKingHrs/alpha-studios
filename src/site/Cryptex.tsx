import { useCallback, useEffect, useRef, useState } from 'react';
import type { LinkFn } from './parts';

/**
 * The hidden way into the crew portal. Nothing on the site links to it: tap the logo seven times quickly, or type
 * the word "cryptex". A box of five lettered wheels opens; set them to the secret word and the entrance appears.
 * This hides the door; it does not lock it. The portal's own sign-in and the database rules do that.
 */
export const SECRET = 'ALPHA';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const START = 'QZMKX';
const TAPS = 7;
const WINDOW_MS = 5000;

/** Opens the box after seven quick taps on the logo, or after the word "cryptex" is typed outside a text field. */
export function useCryptexTriggers(open: () => void) {
  useEffect(() => {
    let buffer = '';
    let taps: number[] = [];
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-7);
      if (buffer === 'cryptex') {
        buffer = '';
        open();
      }
    };
    const onClick = (e: MouseEvent) => {
      const brand = (e.target as Element | null)?.closest?.('.s-brand');
      if (!brand) return;
      const now = Date.now();
      taps = [...taps.filter((x) => now - x < WINDOW_MS), now];
      if (taps.length >= TAPS) {
        taps = [];
        e.preventDefault();
        open();
      }
    };
    addEventListener('keydown', onKey);
    addEventListener('click', onClick, true);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('click', onClick, true);
    };
  }, [open]);
}

const turn = (letter: string, by: number) =>
  ALPHABET[(ALPHABET.indexOf(letter) + by + ALPHABET.length) % ALPHABET.length];

export function Cryptex({ link, onClose }: { link: LinkFn; onClose: () => void }) {
  const [letters, setLetters] = useState(START.split(''));
  const panel = useRef<HTMLDivElement>(null);
  const solved = letters.join('') === SECRET;

  const change = useCallback((i: number, by: number) => {
    setLetters((l) => l.map((x, k) => (k === i ? turn(x, by) : x)));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = document.activeElement as HTMLElement | null;
    root.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = [
          ...(panel.current?.querySelectorAll<HTMLElement>('[role="spinbutton"], a, button') ?? []),
        ].filter((el) => el.tabIndex >= 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="cx-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className={`cx ${solved ? 'is-solved' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-title"
      >
        <p className="mono cx-kicker">Crew only</p>
        <h2 id="cx-title" className="display">
          Set the five wheels
        </h2>
        <p className="cx-hint">Turn each wheel to spell the word. Arrow keys work too.</p>
        <div className="cx-wheels">
          {letters.map((l, i) => (
            <div key={i} className="cx-wheel">
              <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => change(i, -1)}>
                ▲
              </button>
              <div
                className="cx-letter display"
                role="spinbutton"
                tabIndex={0}
                aria-label={`Wheel ${i + 1} of 5`}
                aria-valuemin={0}
                aria-valuemax={25}
                aria-valuenow={ALPHABET.indexOf(l)}
                aria-valuetext={l}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    change(i, -1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    change(i, 1);
                  }
                }}
              >
                {l}
              </div>
              <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => change(i, 1)}>
                ▼
              </button>
            </div>
          ))}
        </div>
        <p className="cx-status" role="status">
          {solved ? 'Unlocked.' : ''}
        </p>
        {solved && (
          <a className="s-btn s-btn--gold" href={link('/portal/app/')}>
            Enter the portal
          </a>
        )}
        <button type="button" className="cx-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
