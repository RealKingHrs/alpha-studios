import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';

const HOT = 'a, button, [role="button"], summary, label, select';
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]), textarea';

type Mode = 'rest' | 'hot' | 'text';

/**
 * A small dot that follows the pointer and a thin ring that stays close behind it. Over anything you can act on
 * the ring grows a little and the dot shrinks; over a text field it becomes a thin bar. It never fills in or
 * shows words, so it can never cover what you are aiming at. Mouse only.
 */
export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dx = useSpring(x, { stiffness: 1100, damping: 50 });
  const dy = useSpring(y, { stiffness: 1100, damping: 50 });
  const rx = useSpring(x, { stiffness: 420, damping: 32 });
  const ry = useSpring(y, { stiffness: 420, damping: 32 });
  const [state, setState] = useState<{ mode: Mode; down: boolean; gone: boolean }>({
    mode: 'rest',
    down: false,
    gone: true,
  });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      const mode: Mode = t?.closest?.(TEXT) ? 'text' : t?.closest?.(HOT) ? 'hot' : 'rest';
      setState((s) => (s.mode === mode && !s.gone ? s : { ...s, mode, gone: false }));
    };
    const down = () => setState((s) => ({ ...s, down: true }));
    const up = () => setState((s) => ({ ...s, down: false }));
    const leave = () => setState((s) => ({ ...s, gone: true }));
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [x, y]);

  return (
    <div className={`cursor ${state.gone ? 'is-gone' : ''}`} aria-hidden="true">
      <motion.div className="cursor-ring-wrap" style={{ x: rx, y: ry }}>
        <div className={`cursor-ring is-${state.mode} ${state.down ? 'is-down' : ''}`} />
      </motion.div>
      <motion.div className="cursor-dot-wrap" style={{ x: dx, y: dy }}>
        <div className={`cursor-dot is-${state.mode}`} />
      </motion.div>
    </div>
  );
}
