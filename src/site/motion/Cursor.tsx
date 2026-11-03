import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';

const HOT = 'a, button, [role="button"], summary, label, select, input, textarea';

/**
 * A small dot that follows the pointer closely and a ring that trails it. The ring swells over anything you
 * can act on, and becomes a labelled bubble over elements marked data-cursor="Open". Mouse only.
 */
export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dx = useSpring(x, { stiffness: 900, damping: 45 });
  const dy = useSpring(y, { stiffness: 900, damping: 45 });
  const rx = useSpring(x, { stiffness: 150, damping: 19 });
  const ry = useSpring(y, { stiffness: 150, damping: 19 });
  const [state, setState] = useState<{
    hot: boolean;
    label: string | null;
    down: boolean;
    gone: boolean;
  }>({
    hot: false,
    label: null,
    down: false,
    gone: true,
  });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      const label = t?.closest?.('[data-cursor]')?.getAttribute('data-cursor') ?? null;
      const hot = !!t?.closest?.(HOT);
      setState((s) =>
        s.hot === hot && s.label === label && !s.gone ? s : { ...s, hot, label, gone: false },
      );
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
        <div
          className={`cursor-ring ${state.hot ? 'is-hot' : ''} ${state.label ? 'has-label' : ''} ${state.down ? 'is-down' : ''}`}
        >
          {state.label && <span>{state.label}</span>}
        </div>
      </motion.div>
      <motion.div className="cursor-dot-wrap" style={{ x: dx, y: dy }}>
        <div className={`cursor-dot ${state.label ? 'is-hidden' : ''}`} />
      </motion.div>
    </div>
  );
}
