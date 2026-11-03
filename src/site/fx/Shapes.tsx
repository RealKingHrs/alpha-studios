import { motion, useTransform, type MotionValue } from 'motion/react';
import { useMotionOn } from '../motion/context';

/**
 * Flat shapes that drift on slow loops and slide with the scroll. Each one sits behind the cover copy,
 * in one of the five accents. Without motion they are just still shapes.
 */
export function Shapes({ progress }: { progress: MotionValue<number> }) {
  const on = useMotionOn();
  const a = useTransform(progress, [0, 1], ['0%', '-40%']);
  const b = useTransform(progress, [0, 1], ['0%', '-18%']);
  const c = useTransform(progress, [0, 1], ['0%', '-62%']);
  const d = useTransform(progress, [0, 1], ['0%', '-28%']);
  const slots: Array<[string, MotionValue<string>]> = [
    ['circle a-sun', a],
    ['square a-mint', b],
    ['pill a-sky', c],
    ['ring a-lilac', d],
  ];
  return (
    <div className="fx-shapes" aria-hidden="true">
      {slots.map(([cls, y]) => (
        <motion.span key={cls} className="fx-shape-slot" style={on ? { y } : undefined}>
          <span className={`fx-shape fx-shape--${cls}`} />
        </motion.span>
      ))}
    </div>
  );
}
