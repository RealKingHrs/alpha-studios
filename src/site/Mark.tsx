import { motion } from 'motion/react';
import { MARK_GRADIENT, MARK_PATH, MARK_VIEWBOX, MARK_WIDTH } from '../brand/mark';
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
  const id = `m-${className.replace(/\W+/g, '') || 'x'}`;
  const motionProps = on
    ? {
        initial: { pathLength: 0 },
        animate: { pathLength: 1 },
        transition: { duration: 1.6, ease: [0.65, 0, 0.35, 1] as const, delay: 0.25 },
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
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={MARK_GRADIENT.x1}
          y1={MARK_GRADIENT.y1}
          x2={MARK_GRADIENT.x2}
          y2={MARK_GRADIENT.y2}
        >
          <stop offset={MARK_GRADIENT.at} className="mark-stop-ink" />
          <stop offset={MARK_GRADIENT.at} className="mark-stop-gold" />
        </linearGradient>
      </defs>
      <motion.path
        d={MARK_PATH}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={MARK_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...motionProps}
      />
    </svg>
  );
}

/** The round sticker: text set on a circle around a small mark. It spins by CSS. */
export function Sticker({
  text,
  className = '',
  draw = false,
}: {
  text: string;
  className?: string;
  draw?: boolean;
}) {
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
      <Mark className="sticker-mark" draw={draw} />
    </div>
  );
}
