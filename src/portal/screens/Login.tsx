import { useState } from 'react';
import { Field } from '../ui';
import { supabase } from '../supabase';

/** Email and password, plus GitHub sign-in when the project has it switched on (VITE_PORTAL_GITHUB=1). Either way a login only gets access once an invite is redeemed. */
/** GitHub sign-in needs an OAuth app set up in Supabase, so the button only shows once that is switched on. */
const GITHUB = import.meta.env.VITE_PORTAL_GITHUB === '1';

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMessage({ kind: 'error', text: error.message });
    else if (mode === 'up' && !data.session)
      setMessage({ kind: 'info', text: 'Check your email to confirm the login, then sign in.' });
  }

  return (
    <main className="auth">
      <section className="card" aria-labelledby="login-title">
        <h1 id="login-title">Sign in</h1>
        <p className="hint">
          For crew and the admin. New here? Create a login, then enter the invite code you were
          sent.
        </p>
        {GITHUB && (
          <>
            <button
              type="button"
              className="primary wide"
              onClick={() =>
                supabase?.auth.signInWithOAuth({
                  provider: 'github',
                  options: { redirectTo: location.href.split('#')[0] },
                })
              }
            >
              Continue with GitHub
            </button>
            <p className="divider">or</p>
          </>
        )}
        <form onSubmit={submit}>
          <Field label="Email">
            {(id) => (
              <input
                id={id}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Password" hint={mode === 'up' ? 'At least 8 characters.' : undefined}>
            {(id) => (
              <input
                id={id}
                type="password"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <button type="submit" className="primary" disabled={busy}>
            {mode === 'in' ? 'Sign in' : 'Create login'}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
          >
            {mode === 'in' ? 'Create a login instead' : 'I already have a login'}
          </button>
        </form>
        {message && (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={message.kind === 'error' ? 'error' : 'hint'}
          >
            {message.text}
          </p>
        )}
      </section>
    </main>
  );
}
