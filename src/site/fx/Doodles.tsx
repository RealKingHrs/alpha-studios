import type { ReactNode } from 'react';

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** A hand-drawn arrow that draws itself. */
export function DoodleArrow({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`fx-doodle fx-doodle--arrow ${className}`.trim()}
      viewBox="0 0 120 70"
      {...base}
    >
      <path pathLength={1} d="M6 54 C28 8 70 4 108 30 M108 30 L90 28 M108 30 L100 46" />
    </svg>
  );
}

/** A wavy underline that draws under whatever it sits in. */
export function DoodleWave({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`fx-doodle fx-doodle--wave ${className}`.trim()}
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      {...base}
    >
      <path pathLength={1} d="M2 8 Q14 -2 26 8 T50 8 T74 8 T98 8 T122 8 T146 8 T170 8 T198 8" />
    </svg>
  );
}

/** A pencil circle drawn round a phrase. */
export function DoodleCircle({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`fx-doodle fx-doodle--circle ${className}`.trim()}
      viewBox="0 0 300 100"
      preserveAspectRatio="none"
      {...base}
    >
      <path
        pathLength={1}
        d="M150 6 C70 4 8 24 10 52 C12 82 90 96 168 92 C250 88 294 66 288 40 C282 16 210 6 128 10"
      />
    </svg>
  );
}

/** A starburst sticker with a short word on it. */
export function Starburst({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`fx-burst ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <path d="M50 2 L58 20 L77 10 L76 31 L97 31 L84 48 L99 63 L78 66 L82 87 L62 80 L52 99 L42 81 L22 90 L22 69 L2 63 L17 48 L3 33 L24 31 L23 11 L42 20 Z" />
      </svg>
      <b>{children}</b>
    </span>
  );
}

/** A handwritten note in the margin, with a small arrow. */
export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`fx-note ${className}`.trim()} aria-hidden="true">
      {children}
      <DoodleArrow />
    </span>
  );
}
