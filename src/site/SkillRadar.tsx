import type { Member } from '../content/schema';

type Skills = Member['skills'];

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
        viewBox="-36 -6 272 212"
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
