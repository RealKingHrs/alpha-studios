import { useSyncExternalStore } from 'react';

/** Minimal history router: the address bar is the single source of truth for where the visitor is. */
const EVENT = 'alpha:navigate';

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** `initial` is the address the server rendered, so hydration matches. */
export function usePathname(initial: string): string {
  return useSyncExternalStore(
    subscribe,
    () => location.pathname,
    () => initial,
  );
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === location.pathname + location.search) return;
  history[opts.replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new Event(EVENT));
}

/** Turn same-site link clicks into client navigation. Returns a cleanup. */
export function interceptLinks(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    // A link to a spot on the same page is the browser's job.
    if (a.hash && a.pathname === location.pathname && a.search === location.search) return;
    // The portal is a separate app with its own page.
    if (/\/portal\/app\//.test(a.pathname)) return;
    e.preventDefault();
    navigate(a.pathname + a.search);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
