/**
 * The wordmark: "alpha." in heavy Fraunces italic with a gold full stop, and "studios" in spaced mono
 * under it, right aligned. Live text, so it stays sharp and readable; the link around it carries the name.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wm ${className}`.trim()} aria-hidden="true">
      <span className="wm-word">
        alpha<span className="wm-dot">.</span>
      </span>
      <span className="wm-sub">studios</span>
    </span>
  );
}
