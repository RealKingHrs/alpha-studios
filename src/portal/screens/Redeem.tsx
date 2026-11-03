import { useState } from 'react';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import { Field } from '../ui';

/** A signed-in login with no profile yet. The code is checked in the database, not here. */
export function Redeem({ email }: { email: string }) {
  const { refresh, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('redeem_invite', {
      p_code: code,
      p_consent: consent,
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data?.ok) return setError(data?.error ?? 'That code did not work.');
    location.hash = '#/profile';
    await refresh();
  }

  return (
    <main className="auth">
      <section className="card" aria-labelledby="redeem-title">
        <h1 id="redeem-title">Enter your invite code</h1>
        <p className="hint">
          Signed in as {email}. The admin gave you a code like 1A2B-3C4D-5E6F. It works once and
          expires after seven days.
        </p>
        <form onSubmit={submit}>
          <Field label="Invite code">
            {(id) => (
              <input
                id={id}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree that my name, role, bio and links are shown publicly on the Alpha Studios
              site.
            </span>
          </label>
          <button type="submit" className="primary" disabled={busy || !consent}>
            Join the crew
          </button>
          <a className="link" href="#/">
            Back to sharing an idea
          </a>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
