import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * Content slides up as it scrolls into view. It is plain, fully visible HTML first: the hiding only starts
 * once this code has run, and anything already on screen is shown straight away, so nothing flashes.
 */
export function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  children,
}: {
  as?: ElementType;
  className?: string;
  /** Milliseconds to wait, so neighbours can arrive one after another. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      root.classList.contains('reduce-motion')
    )
      return;
    if (!('IntersectionObserver' in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return; // already on screen: leave it visible
    root.classList.add('reveal-on');
    el.classList.add('is-waiting');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.remove('is-waiting');
        el.classList.add('is-in');
        io.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
