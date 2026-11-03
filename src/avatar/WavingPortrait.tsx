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
      <g className="wv-arm">
        {/* upper arm, out to the elbow */}
        <path
          d="M 168 210 L 226 204"
          stroke={INK}
          strokeWidth={36}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 168 210 L 226 204"
          stroke={sleeve}
          strokeWidth={30}
          strokeLinecap="round"
          fill="none"
        />
        {/* forearm and hand pivot on the elbow */}
        <g className="wv-fore">
          <path
            d="M 226 204 L 240 138"
            stroke={INK}
            strokeWidth={32}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 226 204 L 240 138"
            stroke={sleeve}
            strokeWidth={26}
            strokeLinecap="round"
            fill="none"
          />
          <g className="wv-hand">
            {[
              [-15, 222, 26],
              [-5, 232, 31],
              [5, 242, 29],
              [15, 252, 22],
            ].map(([deg, x, h]) => (
              <rect
                key={x}
                x={x}
                y={106 - h}
                width={10}
                height={h + 12}
                rx={5}
                fill={skin}
                {...STROKE}
                strokeWidth={2.6}
                transform={`rotate(${deg} ${x + 5} 112)`}
              />
            ))}
            <rect
              x={207}
              y={108}
              width={10}
              height={26}
              rx={5}
              fill={skin}
              {...STROKE}
              strokeWidth={2.6}
              transform="rotate(-52 217 126)"
            />
            <rect x={220} y={100} width={40} height={44} rx={17} fill={skin} {...STROKE} />
            <rect x={225} y={96} width={30} height={12} fill={skin} />
          </g>
        </g>
      </g>
    </svg>
  );
}
