import { BOWL_PATH, BOWL_TRANSFORM, MARK_VIEWBOX, STEM_PATH } from '../brand/mark';

/** The alpha mark in ink with the gold flick, as inline SVG. */
export function Mark({ className = '', title }: { className?: string; title?: string }) {
  const id = `m-${className.replace(/\W+/g, '') || 'x'}`;
  return (
    <svg
      className={`mark ${className}`.trim()}
      viewBox={MARK_VIEWBOX}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={`${id}-flick`}>
          <polygon points="140,160 205,108 218,108 218,185 140,185" />
        </clipPath>
      </defs>
      <g transform={BOWL_TRANSFORM}>
        <path d={BOWL_PATH} fillRule="evenodd" className="mark-ink" />
      </g>
      <path d={STEM_PATH} className="mark-ink" />
      <path d={STEM_PATH} className="mark-gold" clipPath={`url(#${id}-flick)`} />
    </svg>
  );
}

/** The spinning round sticker: text set on a circle around a small mark. */
export function Sticker({ text, className = '' }: { text: string; className?: string }) {
  const id = `ring-${text.replace(/\W+/g, '').slice(0, 8)}`;
  const line = `${text} • ${text} • `;
  return (
    <div className={`sticker ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} startOffset="0">
            {line}
          </textPath>
        </text>
      </svg>
      <Mark className="sticker-mark" />
    </div>
  );
}
