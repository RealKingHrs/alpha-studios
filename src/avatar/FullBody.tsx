import { portraitSpec } from './portraitSpec';
import { Portrait } from './Portrait';

const INK = 'var(--ink)';
const STROKE = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const fill = (swatch: string) => `var(--${swatch})`;
const darker = (swatch: string, pct = 78) => `color-mix(in srgb, var(--${swatch}) ${pct}%, #000)`;

/**
 * The saved avatar as a whole character: the head and shoulders from Portrait, with a body, arms and legs
 * drawn from the same saved options (outfit and skin). Pure SVG. Each limb is its own group so CSS can swing the
 * arms, wave the right hand and shuffle the feet. It reads only the stored record, so every old avatar still draws.
 */
export function FullBody({
  record,
  className = '',
  label,
}: {
  record: unknown;
  className?: string;
  label?: string;
}) {
  const s = portraitSpec(record);
  const skin = fill(s.skin);
  const outfit = fill(s.outfit.color);
  const trousers = darker(s.outfit.color, 55);
  const sleeve = s.outfit.style === 'tee' ? skin : outfit;

  return (
    <svg
      className={`fullbody ${className}`.trim()}
      viewBox="0 0 200 430"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g className="fb-body">
        {/* legs and shoes */}
        {[0, 1].map((k) => (
          <g key={k} className={`fb-leg fb-leg--${k ? 'r' : 'l'}`}>
            <rect
              x={k ? 102 : 54}
              y={300}
              width={44}
              height={102}
              rx={14}
              fill={trousers}
              {...STROKE}
            />
            <path
              d={
                k
                  ? 'M 98 398 H 152 Q 164 398 164 412 V 418 H 98 Z'
                  : 'M 102 398 H 48 Q 36 398 36 412 V 418 H 102 Z'
              }
              fill="var(--paper)"
              {...STROKE}
            />
          </g>
        ))}

        {/* torso */}
        <path d="M 22 200 L 178 200 L 156 330 Q 100 346 44 330 Z" fill={outfit} {...STROKE} />
        {s.outfit.style === 'hoodie' && (
          <path
            d="M 70 290 H 130 L 124 318 H 76 Z"
            fill={darker(s.outfit.color, 84)}
            {...STROKE}
            strokeWidth={2.5}
          />
        )}
        <path d="M 44 318 Q 100 334 156 318" fill="none" stroke={INK} strokeWidth={3.5} />
        <rect
          x={90}
          y={312}
          width={20}
          height={14}
          rx={4}
          fill="var(--gold)"
          {...STROKE}
          strokeWidth={2.5}
        />

        {/* arms: the left one swings, the right one waves */}
        <g className="fb-arm fb-arm--l">
          <rect x={4} y={196} width={34} height={104} rx={17} fill={sleeve} {...STROKE} />
          <circle cx={21} cy={312} r={15} fill={skin} {...STROKE} />
        </g>
        <g className="fb-arm fb-arm--r">
          <rect x={162} y={196} width={34} height={104} rx={17} fill={sleeve} {...STROKE} />
          <circle cx={179} cy={312} r={15} fill={skin} {...STROKE} />
        </g>
      </g>

      <svg x={0} y={0} width={200} height={220} viewBox="0 0 200 220" overflow="visible">
        <Portrait record={record} />
      </svg>
    </svg>
  );
}
