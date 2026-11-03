import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { magnetOffset } from '../../ui/magnet';
import { useMotionOn } from './context';

/** Wraps a button or link so it leans toward the pointer as it comes near, and settles back like a spring. */
export function Magnetic({ children, strength = 1 }: { children: ReactNode; strength?: number }) {
  const on = useMotionOn();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 230, damping: 17, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 230, damping: 17, mass: 0.6 });

  useEffect(() => {
    const el = ref.current;
    if (!on || !el || !matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const o = magnetOffset(el.getBoundingClientRect(), e.clientX, e.clientY, 80, 11 * strength);
      x.set(o.x);
      y.set(o.y);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [on, strength, x, y]);

  if (!on) return <>{children}</>;
  return (
    <motion.span ref={ref} className="magnetic" style={{ x: sx, y: sy }}>
      {children}
    </motion.span>
  );
}
