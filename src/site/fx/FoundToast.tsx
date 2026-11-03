import { useEffect, useState } from 'react';
import type { Route } from '../../routes';

const FOUND: Record<string, string> = {
  projects: 'the drops',
  project: 'a case study',
  crew: 'the crew deck',
  member: 'a crew card',
  launchpad: 'the Launchpad',
  about: 'the origin story',
  contact: 'the inbox',
  certificate: 'a trophy',
};

/**
 * Achievement-style toast: the first time you open a kind of page in this tab it says what you unlocked.
 * Nothing is kept beyond the tab and nothing is sent anywhere.
 */
export function FoundToast({ route }: { route: Route }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const what = FOUND[route.name];
    if (!what) return;
    let show: ReturnType<typeof setTimeout> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    try {
      const seen = JSON.parse(sessionStorage.getItem('alpha.found') ?? '[]') as string[];
      if (seen.includes(route.name)) return;
      sessionStorage.setItem('alpha.found', JSON.stringify([...seen, route.name]));
      show = setTimeout(() => setText(`Unlocked ${what}`), 600);
      hide = setTimeout(() => setText(''), 4200);
    } catch {
      /* storage blocked: no toast */
    }
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [route.name]);
  if (!text) return null;
  return (
    <div className="fx-toast" role="status">
      <span className="fx-toast-icon" aria-hidden="true">
        ★
      </span>
      <span>
        <small className="mono">Achievement</small>
        {text}
      </span>
    </div>
  );
}
