import { useEffect } from 'react';

/** A ring spreads from the spot a finger lands. Touch and pen only; the stylesheet draws it. */
export function useTapRipples(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      r.addEventListener('animationend', () => r.remove(), { once: true });
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, [enabled]);
}
