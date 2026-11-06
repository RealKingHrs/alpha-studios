import { useEffect, useRef, useState } from 'react';
import { PIN_HANDOFF_KEY, isPin } from '../../ui/pin';
import { supabase } from '../supabase';

const fnUrl = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/portal-pin`;
const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const DOOR_NOTE_KEY = 'alpha:door-note';
/** The website's door, where the wheels are. It is the only place a PIN is set. */
const DOOR = `${import.meta.env.BASE_URL}?door=1`;

async function call(body: Record<string, unknown>) {
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    hint?: string;
    session?: { access_token: string; refresh_token: string };
  };
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

/**
 * The PIN is entered once, on the website's wheels, and handed to this tab. Here it is checked and a six-digit code
 * is emailed; the code opens the portal. If the PIN is wrong or missing, the person is sent back to the wheels, so
 * there is never a second set of wheels in the portal.
 */
export function PinLogin() {
  const [step, setStep] = useState<'checking' | 'code' | 'none'>('checking');
  const [pin, setPin] = useState('');
  const [hint, setHint] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeBox = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let waiting = '';
    try {
      waiting = sessionStorage.getItem(PIN_HANDOFF_KEY) ?? '';
      sessionStorage.removeItem(PIN_HANDOFF_KEY);
    } catch {
      /* storage blocked: send them to the door */
    }
    if (!isPin(waiting)) {
      setStep('none');
      return;
    }
    setPin(waiting);
    call({ action: 'start', pin: waiting })
      .then((r) => {
        setHint(r.hint ?? '');
        setStep('code');
      })
      .catch((e: Error) => {
        try {
          sessionStorage.setItem(DOOR_NOTE_KEY, e.message);
        } catch {
          /* the door just opens without the note */
        }
        location.replace(DOOR);
      });
  }, []);

  useEffect(() => {
    if (step === 'code') codeBox.current?.focus();
  }, [step]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call({ action: 'verify', pin, token: code });
      if (!r.session) throw new Error('No session came back. Try again.');
      const { error: e2 } = await supabase.auth.setSession(r.session);
      if (e2) throw e2;
    } catch (e2) {
      setError((e2 as Error).message);
      setBusy(false);
    }
  }

  if (step === 'checking')
    return (
      <main className="auth">
        <section className="card" aria-labelledby="login-title">
          <h1 id="login-title">Checking your PIN</h1>
          <p role="status" className="hint">
            One moment. We are sending your code.
          </p>
        </section>
      </main>
    );

  if (step === 'none')
    return (
      <main className="auth">
        <section className="card" aria-labelledby="login-title">
          <p className="mono hint">Crew only</p>
          <h1 id="login-title">Enter your PIN</h1>
          <p className="hint">
            Your PIN is entered on the wheels on the website. Open them, enter your PIN, and we will
            email you a six-digit code.
          </p>
          <a className="primary wide" href={DOOR}>
            Open the PIN wheels
          </a>
        </section>
      </main>
    );

  return (
    <main className="auth">
      <section className="card" aria-labelledby="login-title">
        <p className="mono hint">Crew only</p>
        <h1 id="login-title">Check your email</h1>
        <form onSubmit={verify}>
          <p className="hint">
            We sent a six-digit code to <strong>{hint}</strong>. It works for ten minutes.
          </p>
          <label htmlFor="otp" className="visually-hidden">
            Six-digit code
          </label>
          <input
            id="otp"
            ref={codeBox}
            className="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="primary wide" disabled={busy || code.length < 6}>
            {busy ? 'Opening…' : 'Open the portal'}
          </button>
          <a className="link" href={DOOR}>
            Use a different PIN
          </a>
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
