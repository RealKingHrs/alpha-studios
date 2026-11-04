import { useId } from 'react';

/**
 * A round rubber stamp: text set on a circle around an "a." in the middle, drawn with a rough edge like real ink.
 * It turns slowly, and thumps down once when it first appears. Decorative, so hidden from assistive tech.
 */
export function Stamp({
  text = 'ALPHA STUDIOS · BUILT AT TWENTY · ',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const ring = `M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0`;
  return (
    <svg className={`fx-stamp ${className}`.trim()} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={`r${id}`} d={ring} />
        <filter id={`f${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
      </defs>
      <g filter={`url(#f${id})`}>
        <circle cx="100" cy="100" r="92" className="fx-stamp-ring" />
        <circle cx="100" cy="100" r="58" className="fx-stamp-ring fx-stamp-ring--thin" />
        <text x="96" y="124" textAnchor="middle" className="fx-stamp-a">
          a<tspan className="fx-stamp-dot">.</tspan>
        </text>
      </g>
      {/* Outside the filter: it turns every frame, and a filter would be redrawn every frame with it. */}
      <g className="fx-stamp-turn">
        <text className="fx-stamp-text">
          <textPath href={`#r${id}`} startOffset="0" textLength="440" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </g>
    </svg>
  );
}
