import { motion } from 'motion/react';
import { BOWL_PATH, BOWL_TRANSFORM, FLICK_PATH, MARK_VIEWBOX, STEM_PATH } from '../brand/mark';
import { useMotionOn } from './motion/context';

/** The alpha mark in ink with the gold flick, as inline SVG. With motion on, it draws itself, then fills. */
export function Mark({
  className = '',
  title,
  draw = false,
}: {
  className?: string;
  title?: string;
  draw?: boolean;
}) {
  const on = useMotionOn() && draw;
  const common = on
    ? {
        initial: { pathLength: 0, fillOpacity: 0 },
        animate: { pathLength: 1, fillOpacity: 1 },
        transition: {
          pathLength: { duration: 1.5, ease: [0.65, 0, 0.35, 1] as const, delay: 0.25 },
          fillOpacity: { duration: 0.7, delay: 1.35 },
        },
        stroke: 'var(--ink)',
        strokeWidth: 2.2,
      }
    : {};
  return (
    <svg
      className={`mark ${className}`.trim()}
      viewBox={MARK_VIEWBOX}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g transform={BOWL_TRANSFORM}>
        <motion.path d={BOWL_PATH} fillRule="evenodd" className="mark-ink" {...common} />
      </g>
      <motion.path d={STEM_PATH} className="mark-ink" {...common} />
      <motion.path
        d={FLICK_PATH}
        className="mark-gold"
        {...(on
          ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 1.8, duration: 0.6 },
            }
          : {})}
      />
    </svg>
  );
}

/** The round sticker: text set on a circle around a small mark. It spins by CSS. */
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
