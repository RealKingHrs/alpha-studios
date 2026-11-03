import { useId } from 'react';
import type { Member } from '../content/schema';

type Skills = Member['skills'];

/** A test tube whose liquid rises to the rating. The wave and bubbles are CSS, and stop for reduced motion. */
function Tube({ name, level, tint }: { name: string; level: number; tint: string }) {
  const uid = useId().replace(/:/g, '');
  const top = 74 - level * 13.2; // 1 = low, 5 = nearly full
  return (
    <li className="tube">
      <svg viewBox="0 0 40 96" role="img" aria-label={`${name}, level ${level} of 5`}>
        <defs>
          <clipPath id={`${uid}-t`}>
            <path d="M 8 6 H 32 V 74 Q 32 90 20 90 Q 8 90 8 74 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-t)`}>
          <rect x="0" y="0" width="40" height="96" fill="var(--paper)" />
          <g className="tube-liquid" style={{ transform: `translateY(${top}px)` }}>
            <path
              className="tube-wave"
              d="M -40 4 Q -30 -2 -20 4 T 0 4 T 20 4 T 40 4 T 60 4 T 80 4 V 100 H -40 Z"
              fill={tint}
            />
            {[14, 24, 20].map((x, i) => (
              <circle
                key={x}
                className="tube-bubble"
                cx={x}
                cy={44}
                r={2 + (i % 2)}
                style={{ animationDelay: `${i * -0.9}s` }}
                fill="var(--paper)"
                opacity="0.7"
              />
            ))}
          </g>
        </g>
        <path
          d="M 8 6 H 32 V 74 Q 32 90 20 90 Q 8 90 8 74 Z"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M 4 6 H 36" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        {[1, 2, 3, 4].map((n) => (
          <path key={n} d={`M 8 ${74 - n * 13.2} h 5`} stroke="var(--ink)" strokeWidth="1.8" />
        ))}
      </svg>
      <span className="tube-name">{name}</span>
    </li>
  );
}

const TINTS = ['var(--tomato)', 'var(--sky)', 'var(--mint)', 'var(--lilac)', 'var(--sun)'];

/** A row of tubes, one per skill. */
export function SkillGauges({ skills, className = '' }: { skills: Skills; className?: string }) {
  if (skills.length === 0) return null;
  return (
    <ul className={`tubes ${className}`.trim()} aria-label="Skills">
      {skills.map((s, i) => (
        <Tube key={s.name} name={s.name} level={s.level} tint={TINTS[i % TINTS.length]} />
      ))}
    </ul>
  );
}

/** A constellation: each skill is a point on a ring, pushed out by its rating, and joined into a shape. */
export function SkillRadar({ skills }: { skills: Skills }) {
  const items = skills.slice(0, 8);
  if (items.length < 3) return null;
  const R = 78;
  const at = (i: number, level: number) => {
    const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    const r = (level / 5) * R;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r] as const;
  };
  const poly = items.map((s, i) => at(i, s.level).join(',')).join(' ');
  return (
    <figure className="radar">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Skills chart: ${items.map((s) => `${s.name} ${s.level} of 5`).join(', ')}`}
      >
        {[1, 2, 3, 4, 5].map((l) => (
          <polygon
            key={l}
            points={items.map((_, i) => at(i, l).join(',')).join(' ')}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1"
            opacity="0.25"
          />
        ))}
        {items.map((_, i) => (
          <line
            key={i}
            x1="100"
            y1="100"
            x2={at(i, 5)[0]}
            y2={at(i, 5)[1]}
            stroke="var(--ink)"
            strokeWidth="1"
            opacity="0.25"
          />
        ))}
        <polygon
          className="radar-shape"
          points={poly}
          fill="var(--accent, var(--sun))"
          fillOpacity="0.55"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {items.map((s, i) => {
          const [x, y] = at(i, s.level);
          const [lx, ly] = at(i, 5.9);
          return (
            <g key={s.name}>
              <circle
                className="radar-dot"
                cx={x}
                cy={y}
                r="4.5"
                fill="var(--ink)"
                style={{ animationDelay: `${i * 0.08}s` }}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--ink)"
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
