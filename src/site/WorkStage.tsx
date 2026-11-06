import { motion, useMotionValue, useSpring } from 'motion/react';
import { useRef } from 'react';
import type { Project } from '../content/schema';
import { DeviceMock } from './DeviceMock';
import { useMotionOn } from './motion/context';
import { tiltFor } from './motion/helpers';

type Shots = Project['screenshots'];

/**
 * The devices of a project: three depths that drift at different speeds as you scroll, and a gentle 3D tilt
 * toward the cursor. Without motion they simply sit in place.
 */
export function WorkStage({
  shots,
  name,
  asset,
  className = '',
}: {
  shots: Shots;
  name: string;
  asset: (p: string) => string;
  className?: string;
}) {
  const on = useMotionOn();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });

  const onMove = (e: React.PointerEvent) => {
    if (!on || e.pointerType !== 'mouse' || !ref.current) return;
    const t = tiltFor({ x: e.clientX, y: e.clientY }, ref.current.getBoundingClientRect(), 8);
    rx.set(t.rotateX);
    ry.set(t.rotateY);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div
      className={`s-work-stage ${className}`.trim()}
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <motion.div
        className="stage-tilt"
        style={on ? { rotateX: rx, rotateY: ry, transformPerspective: 1300 } : undefined}
      >
        {shots.map((s, i) => (
          <div key={s.src} className={`device-slot d${i}`}>
            <DeviceMock shot={s} src={asset(`/${s.src}`)} label={name} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
