import Lenis from 'lenis';
import { useEffect } from 'react';

let current: Lenis | null = null;

/** Jump (or glide) to the top, for page changes. Works with or without smooth scrolling. */
export function scrollToTop(immediate = true) {
  if (current) current.scrollTo(0, { immediate });
  else window.scrollTo(0, 0);
}

/**
 * Silky scrolling with Lenis, for mouse and trackpad users only. Touch devices keep their own native feel,
 * keyboard scrolling and find-in-page are untouched, and links to a spot on the page still glide there.
 */
export function SmoothScroll({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !matchMedia('(pointer: fine)').matches) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    current = lenis;
    let raf = requestAnimationFrame(function loop(t) {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    });
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
      if (!a || !a.hash || a.pathname !== location.pathname) return;
      const el = document.querySelector<HTMLElement>(a.hash);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -72 });
      history.replaceState(null, '', a.hash);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
      if (current === lenis) current = null;
    };
  }, [enabled]);
  return null;
}
