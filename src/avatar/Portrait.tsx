import { useId } from 'react';
import { personalSeed, portraitSpec, type PortraitSpec } from './portraitSpec';

const CX = 100;
const CY = 100;

/** The head outline as a path, so the same shape can be filled and used to clip hair. */
function headPath(
  shape: PortraitSpec['head']['shape'],
  rx: number,
  ry: number,
  grow = 0,
  lift = 0,
) {
  const a = rx + grow;
  const b = ry + grow;
  const cy = CY - lift;
  if (shape === 'long' || shape === 'broad') {
    const r = shape === 'long' ? a * 0.82 : b * 0.7;
    const w = a;
    const h = shape === 'long' ? b : b * 0.92;
    return `M ${CX - w + r} ${cy - h} H ${CX + w - r} Q ${CX + w} ${cy - h} ${CX + w} ${cy - h + r} V ${cy + h - r} Q ${CX + w} ${cy + h} ${CX + w - r} ${cy + h} H ${CX - w + r} Q ${CX - w} ${cy + h} ${CX - w} ${cy + h - r} V ${cy - h + r} Q ${CX - w} ${cy - h} ${CX - w + r} ${cy - h} Z`;
  }
  if (shape === 'narrow') {
    return `M ${CX - a} ${cy - 6} A ${a} ${b * 0.9} 0 0 1 ${CX + a} ${cy - 6} V ${cy + b * 0.35} Q ${CX + a} ${cy + b} ${CX} ${cy + b + 4} Q ${CX - a} ${cy + b} ${CX - a} ${cy + b * 0.35} Z`;
  }
  return `M ${CX - a} ${cy} A ${a} ${b} 0 1 0 ${CX + a} ${cy} A ${a} ${b} 0 1 0 ${CX - a} ${cy} Z`;
}

const INK = 'var(--ink)';
const fill = (swatch: string) => `var(--${swatch})`;
const SILVER = '#E9ECEF';
const STROKE = {
  stroke: INK,
  strokeWidth: 2.6,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;
const darker = (swatch: string, pct = 78) => `color-mix(in srgb, var(--${swatch}) ${pct}%, #000)`;

/** The fringe line of each hairstyle: the hair covers everything above it. */
const FRINGE: Record<string, string> = {
  short: 'M 0 0 H 200 V 70 Q 150 56 100 66 T 0 70 Z',
  buzz: 'M 0 0 H 200 V 66 Q 100 56 0 66 Z',
  long: 'M 0 0 H 200 V 72 Q 150 60 100 68 T 0 72 Z',
  bun: 'M 0 0 H 200 V 68 Q 150 56 100 64 T 0 68 Z',
  spiky: 'M 0 0 H 200 V 64 Q 100 56 0 64 Z',
  sidePart: 'M 0 0 H 200 V 80 Q 150 74 114 52 Q 80 68 0 78 Z',
  curly: 'M 0 0 H 200 V 54 Q 100 50 0 54 Z',
};

function Eye({
  x,
  y,
  r,
  style,
}: {
  x: number;
  y: number;
  r: number;
  style: PortraitSpec['eyes']['style'];
}) {
  if (style === 'dots') return <circle cx={x} cy={y} r={r * 0.62} fill={INK} />;
  if (style === 'sleepy')
    return (
      <path
        d={`M ${x - r} ${y} A ${r} ${r} 0 0 0 ${x + r} ${y}`}
        fill="none"
        stroke={INK}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    );
  const big = style === 'wide' ? 1.25 : style === 'close' ? 0.9 : 1.05;
  return (
    <g>
      <circle cx={x} cy={y} r={r * big} fill="#fff" stroke={INK} strokeWidth={3} />
      <circle className="portrait-pupil" cx={x} cy={y} r={r * big * 0.5} fill={INK} />
      <circle cx={x + r * big * 0.18} cy={y - r * big * 0.2} r={r * big * 0.16} fill="#fff" />
    </g>
  );
}

/**
 * A bold geometric character drawn from a saved avatar. Pure SVG: it renders on the server, costs no download
 * beyond this file, and is alive through CSS variables (--look-x, --look-y) that a pointer listener may set.
 */
export function Portrait({
  record,
  className = '',
  label,
}: {
  record: unknown;
  className?: string;
  label?: string;
}) {
  const s = portraitSpec(record);
  const uid = useId().replace(/:/g, '');
  const { rx, ry, shape } = s.head;
  const eyeY = s.eyes.y;
  const exL = CX - s.eyes.gap;
  const exR = CX + s.eyes.gap;
  const hairFill = fill(s.hair.color);
  const frame = fill(s.glasses.color);
  const skin = fill(s.skin);
  const outfit = fill(s.outfit.color);
  const beard = s.facial.style === 'beard';
  const mouthStroke = beard ? 'var(--paper)' : INK;
  const gr = s.eyes.r + 7;
  const seed = personalSeed(record);

  return (
    <svg
      className={`portrait ${className}`.trim()}
      viewBox="0 0 200 220"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ '--seed': seed } as React.CSSProperties}
    >
      <defs>
        <clipPath id={`${uid}-head`}>
          <path d={headPath(shape, rx, ry)} />
        </clipPath>
        <clipPath id={`${uid}-hair`}>
          <path d={headPath(shape, rx, ry, 5, 3)} />
        </clipPath>
        <clipPath id={`${uid}-fringe`}>
          <path d={FRINGE[s.hair.style] ?? FRINGE.short} />
        </clipPath>
      </defs>

      <g className="portrait-figure">
        {/* hair behind the head */}
        {s.hair.style === 'long' && (
          <path
            d="M 36 104 Q 34 30 100 28 Q 166 30 164 104 L 172 178 Q 100 194 28 178 Z"
            fill={hairFill}
            {...STROKE}
          />
        )}
        {s.hair.style === 'bun' && <circle cx={CX} cy={26} r={21} fill={hairFill} {...STROKE} />}
        {s.hair.style === 'spiky' &&
          [58, 79, 100, 121, 142].map((x, i) => (
            <path
              key={x}
              d={`M ${x - 11} 46 L ${x + (i - 2) * 2} ${i % 2 ? 14 : 8} L ${x + 11} 46 Z`}
              fill={hairFill}
              {...STROKE}
            />
          ))}
        {s.hair.style === 'curly' &&
          [
            [54, 70, 19],
            [66, 48, 20],
            [88, 36, 20],
            [112, 36, 20],
            [134, 48, 20],
            [146, 70, 19],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={hairFill} {...STROKE} />
          ))}

        {/* ears, neck, hood */}
        {[-1, 1].map((k) => (
          <ellipse
            key={k}
            cx={CX + k * (rx - 1)}
            cy={CY + 4}
            rx={9}
            ry={12}
            fill={skin}
            {...STROKE}
          />
        ))}
        <rect x={82} y={132} width={36} height={34} rx={8} fill={darker(s.skin)} {...STROKE} />
        {s.outfit.style === 'hoodie' && (
          <ellipse cx={CX} cy={160} rx={52} ry={24} fill={darker(s.outfit.color, 82)} {...STROKE} />
        )}

        {/* shoulders and outfit */}
        <path
          d="M 12 222 C 12 176 50 154 100 154 C 150 154 188 176 188 222 Z"
          fill={outfit}
          {...STROKE}
        />
        <ellipse
          cx={CX}
          cy={157}
          rx={22}
          ry={13}
          fill={darker(s.skin)}
          stroke={INK}
          strokeWidth={3}
        />
        {s.outfit.style === 'hoodie' && (
          <g stroke="var(--paper)" strokeWidth={3} strokeLinecap="round">
            <path d="M 88 168 V 196" />
            <path d="M 112 168 V 198" />
          </g>
        )}
        {s.outfit.style === 'collar' && (
          <g fill="var(--paper)" {...STROKE} strokeWidth={2.5}>
            <path d="M 100 168 L 70 152 L 84 184 Z" />
            <path d="M 100 168 L 130 152 L 116 184 Z" />
          </g>
        )}
        {s.outfit.style === 'collar' && (
          <g fill="var(--paper)" stroke={INK} strokeWidth={2}>
            <circle cx={100} cy={192} r={3.2} />
            <circle cx={100} cy={208} r={3.2} />
            <path d="M 126 186 h 22 v 20 h -22 z" fill="none" strokeLinejoin="round" />
          </g>
        )}
        {s.outfit.style === 'tee' && (
          <path
            d="M 86 196 Q 100 206 114 196"
            fill="none"
            stroke="var(--paper)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.7}
          />
        )}
        {s.chain !== 'none' && (
          <g fill="none" strokeLinecap="round">
            <path
              d="M 66 166 Q 100 206 134 166"
              stroke={INK}
              strokeWidth={s.chain === 'thick' ? 11 : 6}
            />
            <path
              d="M 66 166 Q 100 206 134 166"
              stroke={SILVER}
              strokeWidth={s.chain === 'thick' ? 6 : 2.5}
            />
          </g>
        )}

        {/* head and everything on it moves a little with the gaze */}
        <g className="portrait-head">
          <path d={headPath(shape, rx, ry)} fill={skin} {...STROKE} />

          {s.facial.style === 'stubble' && (
            <g clipPath={`url(#${uid}-head)`}>
              <rect
                x={20}
                y={120}
                width={160}
                height={90}
                fill={fill(s.facial.color)}
                opacity={0.3}
              />
            </g>
          )}
          {beard && (
            <g clipPath={`url(#${uid}-head)`}>
              <path
                d="M 20 116 Q 60 126 100 118 Q 140 126 180 116 V 210 H 20 Z"
                fill={fill(s.facial.color)}
              />
            </g>
          )}

          <g className="portrait-face">
            {/* nose */}
            {s.nose === 'dot' && <circle cx={CX} cy={114} r={5} fill={darker(s.skin, 70)} />}
            {s.nose === 'speck' && <circle cx={CX} cy={114} r={3} fill={darker(s.skin, 60)} />}
            {s.nose === 'triangle' && (
              <path
                d="M 100 104 L 108 118 H 92 Z"
                fill={darker(s.skin, 72)}
                stroke={darker(s.skin, 72)}
                strokeWidth={3}
                strokeLinejoin="round"
              />
            )}
            {s.nose === 'line' && (
              <path
                d="M 100 100 V 117 H 108"
                fill="none"
                stroke={darker(s.skin, 55)}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* cheeks */}
            {[-1, 1].map((k) => (
              <ellipse
                key={`b${k}`}
                cx={CX + k * (s.eyes.gap + 14)}
                cy={eyeY + 22}
                rx={9}
                ry={5.5}
                fill="var(--gold)"
                opacity={0.12}
              />
            ))}

            {/* brows and eyes */}
            <g className="portrait-brows">
              {[-1, 1].map((k) => (
                <rect
                  key={k}
                  x={CX + k * s.eyes.gap - s.brows.w / 2}
                  y={eyeY - 26 - s.brows.t / 2}
                  width={s.brows.w}
                  height={s.brows.t}
                  rx={s.brows.t / 2}
                  fill={hairFill}
                  stroke={s.hair.style === 'none' ? INK : 'none'}
                  strokeWidth={s.hair.style === 'none' ? 1.5 : 0}
                  transform={`rotate(${-k * s.brows.tiltDeg} ${CX + k * s.eyes.gap} ${eyeY - 26})`}
                />
              ))}
            </g>
            <g className="portrait-eyes">
              <Eye x={exL} y={eyeY} r={s.eyes.r} style={s.eyes.style} />
              <Eye x={exR} y={eyeY} r={s.eyes.r} style={s.eyes.style} />
            </g>

            {/* mouth */}
            <g className="portrait-mouth">
              {s.mouth.kind === 'flat' && (
                <path
                  d={`M ${CX - s.mouth.w / 2} 134 H ${CX + s.mouth.w / 2}`}
                  stroke={mouthStroke}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
              )}
              {s.mouth.kind === 'smile' && !s.mouth.wide && (
                <path
                  d={`M ${CX - s.mouth.w / 2} 130 Q ${CX} ${142} ${CX + s.mouth.w / 2} 130`}
                  fill="none"
                  stroke={mouthStroke}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
              )}
              {s.mouth.kind === 'smile' && s.mouth.wide && (
                <path
                  d={`M ${CX - s.mouth.w / 2} 128 Q ${CX} ${150} ${CX + s.mouth.w / 2} 128 Z`}
                  fill="#fff"
                  stroke={mouthStroke}
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                />
              )}
              {s.mouth.kind === 'smirk' && (
                <path
                  d={`M ${CX - s.mouth.w / 2} 134 Q ${CX + 4} 142 ${CX + s.mouth.w / 2} 126`}
                  fill="none"
                  stroke={mouthStroke}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
              )}
              {s.mouth.kind === 'open' && (
                <g>
                  <ellipse cx={CX} cy={134} rx={12} ry={10} fill={INK} />
                  <ellipse cx={CX} cy={139} rx={7} ry={4} fill="var(--gold)" />
                </g>
              )}
            </g>
            {s.facial.style === 'moustache' && (
              <path
                d="M 72 126 Q 86 112 100 122 Q 114 112 128 126 Q 112 132 100 127 Q 88 132 72 126 Z"
                fill={fill(s.facial.color)}
                {...STROKE}
                strokeWidth={2.5}
              />
            )}

            {/* glasses */}
            {s.glasses.style !== 'none' && (
              <g
                fill="rgb(255 255 255 / 0.2)"
                stroke={frame}
                strokeWidth={4.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                {[exL, exR].map((x) =>
                  s.glasses.style === 'round' ? (
                    <circle key={x} cx={x} cy={eyeY} r={gr} />
                  ) : s.glasses.style === 'square' ? (
                    <rect
                      key={x}
                      x={x - gr}
                      y={eyeY - gr + 3}
                      width={gr * 2}
                      height={gr * 1.7}
                      rx={5}
                    />
                  ) : (
                    <path
                      key={x}
                      d={`M ${x - gr} ${eyeY - gr + 4} H ${x + gr} Q ${x + gr + 2} ${eyeY + gr * 0.5} ${x} ${eyeY + gr + 3} Q ${x - gr - 2} ${eyeY + gr * 0.5} ${x - gr} ${eyeY - gr + 4} Z`}
                    />
                  ),
                )}
                <path d={`M ${exL + gr} ${eyeY} H ${exR - gr}`} fill="none" />
                <path
                  d={`M ${exL - gr} ${eyeY} L ${CX - rx + 2} ${eyeY - 2} M ${exR + gr} ${eyeY} L ${CX + rx - 2} ${eyeY - 2}`}
                  fill="none"
                  strokeWidth={3.5}
                />
              </g>
            )}
          </g>

          {/* hair in front */}
          {s.hair.style !== 'none' && (
            <g clipPath={`url(#${uid}-hair)`}>
              <g clipPath={`url(#${uid}-fringe)`}>
                <path
                  d={headPath(shape, rx, ry, 5, 3)}
                  fill={hairFill}
                  opacity={s.hair.style === 'buzz' ? 0.5 : 1}
                />
              </g>
            </g>
          )}
          {s.hair.style !== 'none' && s.hair.style !== 'buzz' && (
            <path
              d={`M ${CX - rx - 4} ${CY - 6} Q ${CX - rx} ${CY - 42} ${CX} ${CY - ry - 3}`}
              fill="none"
              stroke={INK}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0}
            />
          )}
          {s.hair.style === 'curly' &&
            [
              [84, 58, 15],
              [116, 58, 15],
              [100, 50, 14],
            ].map(([x, y, r]) => (
              <circle
                key={`f${x}`}
                cx={x}
                cy={y}
                r={r}
                fill={hairFill}
                {...STROKE}
                strokeWidth={2.5}
              />
            ))}

          {/* earrings */}
          {s.earrings === 'stud' &&
            [-1, 1].map((k) => (
              <circle
                key={k}
                cx={CX + k * (rx - 1)}
                cy={CY + 19}
                r={4.5}
                fill={SILVER}
                stroke={INK}
                strokeWidth={2}
              />
            ))}
          {s.earrings === 'hoop' &&
            [-1, 1].map((k) => (
              <circle
                key={k}
                cx={CX + k * (rx - 1)}
                cy={CY + 26}
                r={9}
                fill="none"
                stroke={SILVER}
                strokeWidth={3.5}
              />
            ))}
        </g>
      </g>
    </svg>
  );
}
