import { useEffect, useState, type CSSProperties } from 'react';
import { Wordmark } from '../brand/Wordmark';
import { Stamp } from '../site/fx/Stamp';
import { useAuth } from './auth';
import { badge, unreadTotal } from './messaging';
import { Audit } from './screens/Audit';
import { AvatarScreen } from './screens/AvatarScreen';
import { Certificates } from './screens/Certificates';
import { Crew } from './screens/Crew';
import { Home } from './screens/Home';
import { Messages } from './screens/Messages';
import { Profile } from './screens/Profile';
import { Projects } from './screens/Projects';
import { Submissions } from './screens/Submissions';
import { SettingsScreen } from './screens/Settings';
import type { MemberRow } from './types';
import { OfflineBanner } from './ui';
import { useHeartbeat, useUnread } from './useWorkspace';

/** The page is the first part of the address; a second part (such as a conversation id) goes to that page. */
const useRoute = () => {
  const [hash, setHash] = useState(() => location.hash || '#/home');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/home');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const [page, sub] = hash.replace(/^#\/?/, '').split('/');
  return { page: page || 'home', sub: sub ?? '' };
};

/** Each page has a label, a short line above its title, and the accent colour it wears. */
const PAGES = {
  home: ['Home', 'Overview', 'mint'],
  messages: ['Messages', 'Talk to the crew', 'sky'],
  projects: ['Projects', 'What we are building', 'sun'],
  submissions: ['Launchpad ideas', 'Pitches from outside', 'lilac'],
  profile: ['My profile', 'About you', 'tomato'],
  avatar: ['My avatar', 'Your look', 'lilac'],
  certificates: ['Certificates', 'What you have earned', 'sun'],
  crew: ['Crew', 'Admin: people and PINs', 'gold'],
  settings: ['Site settings', 'Admin: the public site', 'gold'],
  audit: ['Audit log', 'Admin: every change', 'gold'],
} as const;
type PageKey = keyof typeof PAGES;

const GROUPS: Array<{ label: string; pages: PageKey[] }> = [
  { label: 'Workspace', pages: ['home', 'messages', 'projects', 'submissions'] },
  { label: 'You', pages: ['profile', 'avatar', 'certificates'] },
];
const ADMIN_PAGES: PageKey[] = ['crew', 'settings', 'audit'];
const ORDER: PageKey[] = [...GROUPS.flatMap((g) => g.pages), ...ADMIN_PAGES];

export function Shell({ me }: { me: MemberRow }) {
  const { signOut } = useAuth();
  const { page: raw, sub } = useRoute();
  const page: PageKey = raw in PAGES ? (raw as PageKey) : 'home';
  const active = me.access_status === 'active';
  useHeartbeat(active);
  const unread = useUnread(active);
  const unreadCount = unreadTotal(unread.counts);
  const admin = me.role === 'admin';
  const allowed = !ADMIN_PAGES.includes(page) || admin;
  const [, eyebrow, accent] = PAGES[page];

  let screen;
  if (!allowed)
    screen = (
      <>
        <h1>Admin only</h1>
        <p role="alert" className="state error-state">
          Only the admin can open this page.
        </p>
      </>
    );
  else if (page === 'messages')
    screen = (
      <Messages me={me} open={sub} unread={unread.counts} onRead={() => void unread.refresh()} />
    );
  else if (page === 'avatar') screen = <AvatarScreen me={me} />;
  else if (page === 'certificates') screen = <Certificates me={me} />;
  else if (page === 'submissions') screen = <Submissions admin={admin} />;
  else if (page === 'projects') screen = <Projects me={me} />;
  else if (page === 'crew') screen = <Crew />;
  else if (page === 'settings') screen = <SettingsScreen />;
  else if (page === 'audit') screen = <Audit />;
  else if (page === 'profile') screen = <Profile me={me} />;
  else screen = <Home me={me} unread={unreadCount} />;

  const link = (k: PageKey) => {
    return (
      <li key={k}>
        <a
          href={`#/${k}`}
          className={ADMIN_PAGES.includes(k) ? 'admin-link' : undefined}
          data-accent={PAGES[k][2]}
          aria-current={page === k ? 'page' : undefined}
        >
          <span className="nav-num" aria-hidden="true">
            {String(ORDER.indexOf(k) + 1).padStart(2, '0')}
          </span>
          <span className="nav-label">{PAGES[k][0]}</span>
          {k === 'messages' && unreadCount > 0 && (
            <span className="badge nav-unread">
              {badge(unreadCount)}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </a>
      </li>
    );
  };

  return (
    <div
      className="shell"
      data-page={page}
      style={{ '--page-accent': `var(--${accent})` } as CSSProperties}
    >
      <OfflineBanner />
      <aside className="side">
        <a
          className="side-brand"
          href={import.meta.env.BASE_URL}
          aria-label="Alpha Studios, back to the website"
        >
          <Wordmark />
        </a>
        <nav className="side-nav" aria-label="Portal">
          {GROUPS.map((g) => (
            <div key={g.label} className="side-group">
              <p className="side-label">{g.label}</p>
              <ul>{g.pages.map(link)}</ul>
            </div>
          ))}
          {admin && (
            <div className="side-group">
              <p className="side-label admin-label">Admin</p>
              <ul>{ADMIN_PAGES.map(link)}</ul>
            </div>
          )}
        </nav>
        <div className="side-me">
          <span className="side-avatar" aria-hidden="true">
            {me.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="side-who">
            <strong>{me.name}</strong>
            <span className="mono hint">{admin ? 'Admin' : me.role_title || 'Crew'}</span>
          </span>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        <Stamp className="side-stamp" />
      </aside>
      <main id="portal-main">
        {me.access_status === 'revoked' && (
          <p role="alert" className="state error-state">
            Your access has been paused by the admin. You can look around but not change anything.
          </p>
        )}
        <p className="page-eyebrow">{eyebrow}</p>
        {screen}
        <footer className="portal-foot">
          <span className="wm-inline" aria-hidden="true">
            alpha<span>.</span>
          </span>
          <span className="hint">Alpha Studios crew portal. Private to the crew.</span>
        </footer>
      </main>
    </div>
  );
}
