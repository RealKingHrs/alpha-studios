import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import '../styles/portal.css';
import { AuthProvider, useAuth } from './auth';
import { Login } from './screens/Login';
import { Redeem } from './screens/Redeem';
import { Shell } from './Shell';
import { configured } from './supabase';
import { Loading, OfflineBanner } from './ui';

function Gate() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Loading what="Checking your sign-in." />;
  if (state.status === 'signed-out') return <Login />;
  if (state.status === 'no-profile') return <Redeem email={state.email} />;
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
