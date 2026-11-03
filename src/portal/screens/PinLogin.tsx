import { useEffect, useRef, useState } from 'react';
import { PIN_HANDOFF_KEY, PIN_LENGTH, PIN_START, isPin } from '../../ui/pin';
import { PinWheels } from '../../ui/PinWheels';
import { supabase } from '../supabase';

const fnUrl = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/portal-pin`;
const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
 * Two steps. First the five wheels: the person sets their own PIN. A right PIN sends a six-digit code to the email
 * the admin registered for them (shown masked). Then the code opens the portal. There are no passwords.
 */
export function PinLogin() {
  const [wheels, setWheels] = useState(PIN_START.split(''));
  const [step, setStep] = useState<'pin' | 'code'>('pin');
  const [hint, setHint] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pin = wheels.join('');
  const codeBox = useRef<HTMLInputElement>(null);
  const handedOff = useRef(false);

  async function start(value: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await call({ action: 'start', pin: value });
      setHint(r.hint ?? '');
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // A PIN set on the website's hidden door is waiting in this tab. Take it, clear it, and carry on.
  useEffect(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    try {
      const waiting = sessionStorage.getItem(PIN_HANDOFF_KEY);
      sessionStorage.removeItem(PIN_HANDOFF_KEY);
      if (waiting && isPin(waiting)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWheels(waiting.split(''));
        void start(waiting);
      }
    } catch {
      /* storage blocked: the person sets the wheels here */
    }
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

  return (
    <main className="auth">
      <section className="card" aria-labelledby="login-title">
        <p className="mono hint">Crew only</p>
        <h1 id="login-title">{step === 'pin' ? 'Set your PIN' : 'Check your email'}</h1>
        {step === 'pin' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start(pin);
            }}
          >
            <p className="hint">
              Turn the {PIN_LENGTH} wheels to your own PIN (arrow keys, typing or the scroll wheel).
              We will email you a six-digit code.
            </p>
            <PinWheels value={wheels} onChange={setWheels} />
            <button type="submit" className="primary wide" disabled={busy}>
              {busy ? 'Checking…' : 'Send my code'}
            </button>
          </form>
        ) : (
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
            <button
              type="button"
              className="link"
              onClick={() => {
                setStep('pin');
                setCode('');
                setError(null);
              }}
            >
              Use a different PIN
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
