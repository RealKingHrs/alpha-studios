import { useEffect, type RefObject } from 'react';

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/**
 * Which way a character should look: from -1 to 1 on each axis, how far the pointer is from the character's
 * face, measured against a third of the screen. Pure, so it can be tested.
 */
export function lookVector(
  pointer: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  viewport: { w: number; h: number },
) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.42;
  return {
    x: clamp((pointer.x - cx) / (viewport.w * 0.35)),
    y: clamp((pointer.y - cy) / (viewport.h * 0.35)),
  };
}

/**
 * One shared pointer listener turns every character inside `ref` toward the cursor, by setting the CSS
 * variables --look-x and --look-y. Mouse only, and not at all when the visitor prefers reduced motion.
 */
export function usePortraitLook(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let p = { x: innerWidth / 2, y: innerHeight / 2 };
    const apply = () => {
      raf = 0;
      root.querySelectorAll<SVGElement>('.portrait').forEach((el) => {
        const v = lookVector(p, el.getBoundingClientRect(), { w: innerWidth, h: innerHeight });
        el.style.setProperty('--look-x', v.x.toFixed(3));
        el.style.setProperty('--look-y', v.y.toFixed(3));
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      p = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
}
