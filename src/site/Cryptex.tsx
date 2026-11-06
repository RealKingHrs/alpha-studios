import { useEffect, useRef, useState } from 'react';
import { PIN_HANDOFF_KEY, PIN_START } from '../ui/pin';
import { PinWheels } from '../ui/PinWheels';
import type { LinkFn } from './parts';

/**
 * The hidden way into the crew portal. Nothing on the site links to it: tap the logo seven times quickly, or type
 * the word "cryptex". A box of five lettered wheels opens; each person sets their own PIN and continues to the portal,
 * which checks it and emails a one-time code. The PIN is handed over inside this browser tab only (never in the address)
 * and the public site never sends it anywhere. This hides the door; the portal's sign-in and the database rules lock it.
 */
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

/** Where the portal leaves a message for the door when a PIN was not accepted. Same tab only. */
export const DOOR_NOTE_KEY = 'alpha:door-note';

export function Cryptex({ link, onClose }: { link: LinkFn; onClose: () => void }) {
  const [letters, setLetters] = useState(PIN_START.split(''));
  const [note] = useState(() => {
    try {
      const n = sessionStorage.getItem(DOOR_NOTE_KEY);
      sessionStorage.removeItem(DOOR_NOTE_KEY);
      return n ?? '';
    } catch {
      return '';
    }
  });
  const panel = useRef<HTMLDivElement>(null);

  const go = () => {
    try {
      sessionStorage.setItem(PIN_HANDOFF_KEY, letters.join(''));
    } catch {
      /* storage blocked: the person sets the wheels again in the portal */
    }
    location.href = link('/portal/app/');
  };

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
      <div ref={panel} className="cx" role="dialog" aria-modal="true" aria-labelledby="cx-title">
        <p className="mono cx-kicker">Crew only</p>
        <h2 id="cx-title" className="display">
          Enter your PIN
        </h2>
        <p className="cx-hint">
          Turn each wheel to your own five-character PIN. Arrow keys, typing and the scroll wheel
          work too.
        </p>
        <PinWheels value={letters} onChange={setLetters} />
        <p className="cx-status" role="status">
          {note}
        </p>
        <button type="button" className="s-btn s-btn--ink" onClick={go}>
          Continue to the portal
        </button>
        <button type="button" className="cx-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
