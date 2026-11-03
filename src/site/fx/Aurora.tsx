/**
 * Soft drifting colour behind a hero. Five blobs, one per accent, each on its own Fibonacci-length loop
 * (21, 34, 55 s and so on), so the pattern never visibly repeats. Pure CSS; still when motion is off.
 */
export function Aurora({ className = '' }: { className?: string }) {
  return (
    <div className={`fx-aurora ${className}`.trim()} aria-hidden="true">
      <i className="fx-aurora-a" />
      <i className="fx-aurora-b" />
      <i className="fx-aurora-c" />
      <i className="fx-aurora-d" />
      <i className="fx-aurora-e" />
    </div>
  );
}
