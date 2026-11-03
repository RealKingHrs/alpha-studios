import { flowPaths } from './paths';

/** Thin lines that flow slowly behind the hero. Each line runs its dash on a slightly longer loop. */
export function BackgroundPaths() {
  return (
    <div className="fx-paths" aria-hidden="true">
      {([1, -1] as const).map((side) => (
        <svg key={side} viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
          {flowPaths(24, side).map((d, i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              style={
                {
                  '--i': i,
                  strokeWidth: 0.5 + i * 0.03,
                  strokeOpacity: 0.05 + i * 0.012,
                } as React.CSSProperties
              }
            />
          ))}
        </svg>
      ))}
    </div>
  );
}
