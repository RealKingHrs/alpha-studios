import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { Audit } from './screens/Audit';
import { AvatarScreen } from './screens/AvatarScreen';
import { Certificates } from './screens/Certificates';
import { Crew } from './screens/Crew';
import { Pitch } from './screens/Pitch';
import { Profile } from './screens/Profile';
import { Projects } from './screens/Projects';
import { Submissions } from './screens/Submissions';
import { SettingsScreen } from './screens/Settings';
import type { MemberRow } from './types';
import { OfflineBanner } from './ui';

const useHash = () => {
  const [hash, setHash] = useState(() => location.hash || '#/profile');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/profile');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#\/?/, '').split('/')[0] || 'profile';
};

const CREW_PAGES = [
  ['profile', 'My profile'],
  ['avatar', 'My avatar'],
  ['certificates', 'Certificates'],
  ['projects', 'Projects'],
  ['pitch', 'Pitch'],
] as const;
const ADMIN_PAGES = [
  ['crew', 'Crew'],
  ['submissions', 'Submissions'],
  ['settings', 'Site settings'],
  ['audit', 'Audit log'],
] as const;

export function Shell({ me }: { me: MemberRow }) {
  const { signOut } = useAuth();
  const page = useHash();
  const admin = me.role === 'admin';
  const adminPage = ADMIN_PAGES.some(([k]) => k === page);
  const allowed = !adminPage || admin;

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
  else if (page === 'avatar') screen = <AvatarScreen me={me} />;
  else if (page === 'certificates') screen = <Certificates me={me} />;
  else if (page === 'pitch') screen = <Pitch name={me.name} />;
  else if (page === 'submissions') screen = <Submissions />;
  else if (page === 'projects') screen = <Projects me={me} />;
  else if (page === 'crew') screen = <Crew />;
  else if (page === 'settings') screen = <SettingsScreen />;
  else if (page === 'audit') screen = <Audit />;
  else screen = <Profile me={me} />;

  return (
    <>
      <OfflineBanner />
      <header className="portal-head">
        <a className="wordmark" href={import.meta.env.BASE_URL}>
          Alpha Studios
        </a>
        <nav aria-label="Portal">
          <ul>
            {CREW_PAGES.map(([k, label]) => (
              <li key={k}>
                <a href={`#/${k}`} aria-current={page === k ? 'page' : undefined}>
                  {label}
                </a>
              </li>
            ))}
            {admin &&
              ADMIN_PAGES.map(([k, label]) => (
                <li key={k}>
                  <a
                    className="admin-only"
                    href={`#/${k}`}
                    aria-current={page === k ? 'page' : undefined}
                  >
                    {label}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
        <span className="who">
          <span className="mono hint">{me.name}</span>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </span>
      </header>
      {me.access_status === 'revoked' && (
        <p role="alert" className="state error-state">
          Your access has been paused by the admin. You can look around but not change anything.
        </p>
      )}
      <main id="portal-main">{screen}</main>
    </>
  );
}
