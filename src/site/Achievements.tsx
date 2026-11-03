import { useEffect } from 'react';
import type { Route } from '../routes';
import { earn, useEarned, useToast } from './achievementStore';
import { ACHIEVEMENTS, TOTAL_XP, levelOf, xpOf } from './motion/achievements';

const ROUTE_AWARD: Partial<Record<Route['name'], string>> = {
  home: 'first-look',
  projects: 'browsed-work',
  project: 'case-study',
  crew: 'meet-crew',
  member: 'meet-crew',
  launchpad: 'open-door',
};

/** Awards the achievements that come from simply visiting a page. */
export function useRouteAchievements(route: Route) {
  useEffect(() => {
    const id = ROUTE_AWARD[route.name];
    if (id) earn(id);
  }, [route.name]);
}

/** Typing "build" anywhere (outside a text field) switches Build mode on or off: the shapes turn into blocks. */
export function useBuildMode() {
  useEffect(() => {
    let buffer = '';
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer.endsWith('build')) {
        const el = document.documentElement;
        el.classList.toggle('build');
        if (el.classList.contains('build')) earn('build-mode');
        buffer = '';
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
}

/** The "Mission passed" toast. Polite for screen readers, never steals focus. */
export function AchievementToast() {
  const id = useToast();
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {a && (
        <p key={a.id} className="toast">
          <span className="toast-kicker mono">Achievement unlocked</span>
          <strong>{a.title}</strong>
          <span className="mono">+{a.xp} XP</span>
        </p>
      )}
    </div>
  );
}

/** Level, XP bar and the list of achievements, for the footer. */
export function XpPanel() {
  const earned = useEarned();
  const xp = xpOf(earned);
  return (
    <details className="xp">
      <summary>
        <span className="mono">
          Level {levelOf(xp)} · {xp}/{TOTAL_XP} XP
        </span>
        <span className="xp-bar" aria-hidden="true">
          <i style={{ width: `${Math.round((xp / TOTAL_XP) * 100)}%` }} />
        </span>
      </summary>
      <ul>
        {ACHIEVEMENTS.map((a) => {
          const got = earned.includes(a.id);
          return (
            <li key={a.id} className={got ? 'got' : ''}>
              <strong>{got ? a.title : '???'}</strong>
              <span>{got ? 'Unlocked' : a.hint}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
