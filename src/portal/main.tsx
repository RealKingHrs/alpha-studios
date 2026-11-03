import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/wheels.css';
import '../styles/portal.css';
import { AuthProvider, useAuth } from './auth';
import { PinLogin } from './screens/PinLogin';
import { Shell } from './Shell';
import { configured } from './supabase';
import { Loading, OfflineBanner } from './ui';

function Gate() {
  const { state, signOut } = useAuth();
  if (state.status === 'loading') return <Loading what="Checking your sign-in." />;
  if (state.status === 'signed-out') return <PinLogin />;
  if (state.status === 'no-profile')
    return (
      <main className="auth">
        <section className="card">
          <h1>No profile on this login</h1>
          <p className="hint">
            {state.email} is signed in, but it is not linked to a crew profile. Ask the admin to
            check your email and issue you a new PIN, then sign in again.
          </p>
          <button type="button" className="secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </section>
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
