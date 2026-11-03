import type { SceneId } from './popTheme';

/** The animated backdrop behind a character. Simple original shapes, one scene per theme. */
export function PopScene({ scene }: { scene: SceneId }) {
  return (
    <svg
      className={`scene scene--${scene}`}
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {scene === 'lab' && (
        <g>
          <g className="sc-bob">
            <path
              d="M 28 210 L 40 170 V 150 H 56 V 170 L 68 210 Z"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M 33 200 L 63 200 L 68 210 H 28 Z"
              fill="var(--mint)"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
          <g className="sc-bob sc-bob--late">
            <circle
              cx="158"
              cy="190"
              r="22"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
            <path
              d="M 138 192 A 22 22 0 0 0 178 192 Z"
              fill="var(--lilac)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
            <rect
              x="152"
              y="158"
              width="12"
              height="14"
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
          </g>
          {[48, 52, 158, 150, 100, 30].map((x, i) => (
            <circle
              key={i}
              className="sc-bubble"
              cx={x}
              cy={150 - i * 6}
              r={3 + (i % 3)}
              style={{ animationDelay: `${i * -0.7}s` }}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2"
            />
          ))}
        </g>
      )}
      {scene === 'heist' && (
        <g>
          <rect
            x="14"
            y="30"
            width="172"
            height="120"
            rx="6"
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth="3"
            opacity="0.9"
          />
          {[
            [40, 55],
            [100, 48],
            [155, 70],
            [60, 110],
            [140, 120],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="5"
              fill="var(--tomato)"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
          ))}
          <path
            className="sc-thread"
            d="M 40 55 L 100 48 L 155 70 L 140 120 L 60 110 L 40 55"
            fill="none"
            stroke="var(--tomato)"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
          <rect
            className="sc-bob"
            x="76"
            y="72"
            width="30"
            height="22"
            fill="var(--sun)"
            stroke="var(--ink)"
            strokeWidth="2.5"
          />
        </g>
      )}
      {scene === 'blocks' && (
        <g>
          {[
            [30, 60, 26],
            [150, 40, 20],
            [160, 150, 30],
            [26, 170, 22],
            [100, 20, 16],
          ].map(([x, y, r], i) => (
            <g
              key={i}
              className="sc-drift"
              style={{ animationDelay: `${i * -1.3}s` }}
              transform={`translate(${x} ${y})`}
            >
              <rect width={r} height={r} fill="var(--mint)" stroke="var(--ink)" strokeWidth="3" />
              <rect y={r * 0.62} width={r} height={r * 0.38} fill="var(--ink)" opacity="0.28" />
              <rect x={r * 0.62} width={r * 0.38} height={r} fill="var(--ink)" opacity="0.14" />
            </g>
          ))}
        </g>
      )}
      {scene === 'city' && (
        <g>
          <circle
            className="sc-sun"
            cx="100"
            cy="120"
            r="52"
            fill="var(--sun)"
            stroke="var(--ink)"
            strokeWidth="3"
          />
          {[110, 124, 138, 152].map((y) => (
            <rect key={y} x="40" y={y} width="120" height={(y - 100) / 14} fill="var(--tomato)" />
          ))}
          {[
            [14, 150, 26, 80],
            [48, 130, 22, 100],
            [140, 140, 24, 90],
            [168, 120, 26, 110],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="var(--ink)" />
          ))}
          <path
            d="M 20 250 q 6 -40 20 -50 M 20 250 q -6 -24 -22 -30"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
      {scene === 'diner' && (
        <g>
          <g className="sc-sway" style={{ transformOrigin: '100px 20px' }}>
            <path d="M 100 0 V 40" stroke="var(--ink)" strokeWidth="3" />
            <path
              d="M 70 70 Q 100 30 130 70 Z"
              fill="var(--tomato)"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="M 138 200 L 150 250 H 178 L 190 200 Z"
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 140 206 H 188 Q 190 190 164 184 Q 138 190 140 206 Z"
            fill="var(--lilac)"
            stroke="var(--ink)"
            strokeWidth="3"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={i * 34 - 6}
              y="262"
              width="34"
              height="40"
              fill={i % 2 ? 'var(--ink)' : 'var(--paper)'}
              opacity="0.5"
            />
          ))}
        </g>
      )}
      {scene === 'space' && (
        <g>
          {[
            [30, 40],
            [170, 70],
            [140, 20],
            [60, 130],
            [180, 170],
            [24, 200],
          ].map(([x, y], i) => (
            <circle
              key={i}
              className="sc-twinkle"
              cx={x}
              cy={y}
              r={2 + (i % 3)}
              fill="var(--paper)"
              stroke="var(--ink)"
              strokeWidth="1.5"
              style={{ animationDelay: `${i * -0.5}s`, transformOrigin: `${x}px ${y}px` }}
            />
          ))}
          <g className="sc-bob">
            <circle
              cx="150"
              cy="110"
              r="34"
              fill="var(--lilac)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
            <ellipse
              cx="150"
              cy="110"
              rx="56"
              ry="12"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3"
              transform="rotate(-18 150 110)"
            />
            <circle cx="138" cy="100" r="6" fill="var(--paper)" opacity="0.6" />
          </g>
          <circle
            className="sc-drift"
            cx="40"
            cy="170"
            r="14"
            fill="var(--sun)"
            stroke="var(--ink)"
            strokeWidth="3"
          />
        </g>
      )}
      {scene === 'fantasy' && (
        <g>
          <circle
            className="sc-sun"
            cx="150"
            cy="60"
            r="24"
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth="3"
          />
          <path
            d="M 20 240 V 150 H 40 V 130 H 52 V 150 H 70 V 110 L 82 96 L 94 110 V 150 H 112 V 130 H 124 V 150 H 150 V 240 Z"
            fill="var(--ink)"
            opacity="0.9"
          />
          {[
            [60, 80],
            [110, 50],
            [170, 130],
            [30, 100],
          ].map(([x, y], i) => (
            <path
              key={i}
              className="sc-twinkle"
              style={{ animationDelay: `${i * -0.7}s`, transformOrigin: `${x}px ${y}px` }}
              d={`M ${x} ${y - 8} L ${x + 3} ${y - 3} L ${x + 8} ${y} L ${x + 3} ${y + 3} L ${x} ${y + 8} L ${x - 3} ${y + 3} L ${x - 8} ${y} L ${x - 3} ${y - 3} Z`}
              fill="var(--sun)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
          ))}
        </g>
      )}
      {scene === 'stars' && (
        <g>
          {[
            [34, 60],
            [160, 50],
            [150, 190],
            [30, 200],
            [100, 30],
            [172, 120],
          ].map(([x, y], i) => (
            <path
              key={i}
              className="sc-twinkle"
              style={{ animationDelay: `${i * -0.6}s`, transformOrigin: `${x}px ${y}px` }}
              d={`M ${x} ${y - 14} L ${x + 4} ${y - 4} L ${x + 14} ${y} L ${x + 4} ${y + 4} L ${x} ${y + 14} L ${x - 4} ${y + 4} L ${x - 14} ${y} L ${x - 4} ${y - 4} Z`}
              fill={['var(--sun)', 'var(--sky)', 'var(--lilac)'][i % 3]}
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}
    </svg>
  );
}
