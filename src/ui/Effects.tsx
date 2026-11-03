import { useEffect, useRef } from 'react';
import { hover3d } from '../vault/hover';
import { magnetOffset } from './magnet';

const INTERACTIVE = 'a, button, [role="button"], summary, label, select, input, textarea';
const MAGNETIC = '.control, .button, .toggle, .intro-skip';

/**
 * The finishing touches: a small cursor that grows over things you can act on, buttons that lean
 * toward the pointer, and ripples where a finger lands. Mounted only when effects are on.
 */
export function Effects() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let raf = 0;
    let magnets: HTMLElement[] = [];
    const offsets = new Map<HTMLElement, { x: number; y: number }>();

    const refresh = () => {
      magnets = [...document.querySelectorAll<HTMLElement>(MAGNETIC)];
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      for (const m of magnets) {
        offsets.set(m, magnetOffset(m.getBoundingClientRect(), e.clientX, e.clientY));
      }
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.25;
      pos.y += (target.y - pos.y) * 0.25;
      if (el) {
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        const over = document.elementFromPoint(target.x, target.y);
        const hot = hover3d.active || !!over?.closest(INTERACTIVE);
        el.classList.toggle('is-hot', hot);
      }
      for (const [m, o] of offsets) {
        // Offsets are measured from the element's resting place, so remove its own nudge first.
        m.style.transform = o.x || o.y ? `translate(${o.x}px, ${o.y}px)` : '';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      r.addEventListener('animationend', () => r.remove(), { once: true });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      for (const m of magnets) m.style.transform = '';
    };
  }, []);

  return <div ref={dot} className="cursor" aria-hidden="true" />;
}
