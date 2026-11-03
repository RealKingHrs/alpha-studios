import { useEffect } from 'react';

/**
 * A soft pool of light that follows the pointer inside any dark section marked data-spot. It only sets two CSS
 * variables per section; the glow itself is drawn in CSS. Mouse only, and off when motion is off.
 */
export function useSpotlight(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let p = { x: -1000, y: -1000 };
    const apply = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>('[data-spot]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        el.style.setProperty('--mx', `${(p.x - r.left).toFixed(0)}px`);
        el.style.setProperty('--my', `${(p.y - r.top).toFixed(0)}px`);
        el.classList.add('is-lit');
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      p = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => {
      removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
