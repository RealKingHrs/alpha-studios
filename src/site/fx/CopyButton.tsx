import { useState } from 'react';

/** Copies a short text, then says so for two seconds. Hidden where the clipboard is not available. */
export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="s-btn s-btn--line s-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* clipboard blocked: the address is still on screen to select */
        }
      }}
    >
      <span aria-live="polite">{done ? 'Copied' : 'Copy address'}</span>
    </button>
  );
}
