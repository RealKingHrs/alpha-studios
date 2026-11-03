import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/portal.css';
import { AuthProvider, useAuth } from './auth';
import { Login } from './screens/Login';
import { Pitch } from './screens/Pitch';
import { Redeem } from './screens/Redeem';
import { Shell } from './Shell';
import { configured } from './supabase';
import { Loading, OfflineBanner } from './ui';

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function Gate() {
  const { state } = useAuth();
  const hash = useHash();
  if (state.status === 'loading') return <Loading what="Checking your sign-in." />;
  if (state.status === 'signed-out') return <Login />;
  if (state.status === 'no-profile')
    return hash === '#/invite' ? (
      <Redeem email={state.email} />
    ) : (
      <main className="auth wide">
        <Pitch email={state.email} />
        <p>
          <a href="#/invite">Have an invite code?</a>
        </p>
      </main>
    );
  return <Shell me={state.me} />;
}

function Portal() {
  if (!configured) {
    return (
      <main className="portal">
        <h1>Crew portal</h1>
        <p role="status" className="state">
          The portal is not connected to a backend in this build. Set the project address and public
          key, then build again. See docs/RUNBOOK.md.
        </p>
      </main>
    );
  }
  return (
    <AuthProvider>
      <div className="portal">
        <OfflineBanner />
        <Gate />
      </div>
    </AuthProvider>
  );
}

createRoot(document.getElementById('portal')!).render(<Portal />);
