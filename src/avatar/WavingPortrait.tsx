import { Portrait } from './Portrait';
import { portraitSpec } from './portraitSpec';

const INK = 'var(--ink)';
const STROKE = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

/**
 * The saved avatar waving hello: the Portrait plus a raised arm and a five-finger hand that waves on a loop.
 * Skin and sleeve come from the same saved options, so every stored avatar still draws. The frame is wider than
 * the plain Portrait to make room for the arm, so use the plain Portrait where a square is needed (the builder).
 */
export function WavingPortrait({
  record,
  className = '',
  label,
}: {
  record: unknown;
  className?: string;
  label?: string;
}) {
  const s = portraitSpec(record);
  const skin = `var(--${s.skin})`;
  const sleeve = s.outfit.style === 'tee' ? skin : `var(--${s.outfit.color})`;
  return (
    <svg
      className={`waving ${className}`.trim()}
      viewBox="0 0 290 230"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg x={0} y={0} width={200} height={220} viewBox="0 0 200 220" overflow="visible">
        <Portrait record={record} />
      </svg>
      <g className="waving-arm">
        <path
          d="M 172 214 L 232 128"
          stroke={INK}
          strokeWidth={36}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 172 214 L 232 128"
          stroke={sleeve}
          strokeWidth={30}
          strokeLinecap="round"
          fill="none"
        />
        <g className="waving-hand">
          <ellipse cx={236} cy={104} rx={19} ry={22} fill={skin} {...STROKE} />
          {[
            [-34, 0],
            [-16, -6],
            [2, -8],
            [20, -4],
          ].map(([deg, dy], i) => (
            <rect
              key={i}
              x={231}
              y={58 + dy}
              width={10}
              height={34}
              rx={5}
              fill={skin}
              {...STROKE}
              strokeWidth={2.5}
              transform={`rotate(${deg} 236 104)`}
            />
          ))}
          <rect
            x={246}
            y={92}
            width={10}
            height={28}
            rx={5}
            fill={skin}
            {...STROKE}
            strokeWidth={2.5}
            transform="rotate(58 241 104)"
          />
        </g>
      </g>
    </svg>
  );
}
