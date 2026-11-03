import { useState } from 'react';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import type { SubmissionRow } from '../types';
import { Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';

export const PLATFORMS = [
  ['ios', 'iPhone'],
  ['macos', 'Mac'],
  ['android', 'Android'],
  ['web', 'Web'],
] as const;

export const HELP = [
  ['funding', 'Funding'],
  ['backend', 'Backend'],
  ['frontend', 'Frontend'],
  ['design', 'Design'],
  ['launch', 'Launch'],
  ['mentoring', 'Mentoring'],
] as const;

export const STATUS_LABEL: Record<SubmissionRow['status'], string> = {
  new: 'Sent',
  reviewing: 'Being looked at',
  approved: 'Approved',
  declined: 'Not this time',
};

const STEPS = ['About you', 'Your idea', 'How we can help'] as const;

/** A grid of pressable tiles. Pressed tiles are the chosen ones. */
function Tiles({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="slots">
      <legend>{label}</legend>
      <div className="slot-grid">
        {options.map(([k, name]) => {
          const on = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              className={`slot-tile ${on ? 'on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
            >
              {name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** For newcomers: a gentle three-step way to share an idea. Pitches are private to the sender and the studio. */
export function Pitch({ email }: { email: string }) {
  const { signOut } = useAuth();
  const mine = useAsync<SubmissionRow[]>(
    async () =>
      supabase
        ? must(supabase.from('submissions').select('*').order('created_at', { ascending: false }))
        : [],
    'mine',
  );
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [project, setProject] = useState('');
  const [pitch, setPitch] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [help, setHelp] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = [
    name.trim().length > 0,
    project.trim().length > 0 && pitch.trim().length > 0,
    true,
  ][step];

  async function send() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('submissions').insert({
      pitcher_name: name.trim(),
      contact_email: email,
      project_name: project.trim(),
      pitch: pitch.trim(),
      platforms,
      help_wanted: help,
      links: site.trim() ? { site: site.trim() } : {},
    });
    setBusy(false);
    if (e) return setError(e.message);
    setSent(true);
    mine.reload();
  }

  function again() {
    setSent(false);
    setStep(0);
    setProject('');
    setPitch('');
    setPlatforms([]);
    setHelp([]);
    setSite('');
  }

  return (
    <>
      <h1>Share your idea</h1>
      <p className="hint">
        We are so glad you are here. Three quick steps, no wrong answers. You are signed in as{' '}
        {email}.
      </p>

      {sent ? (
        <section className="card pitch-done" aria-labelledby="done-title">
          <p className="pitch-spark display" aria-hidden="true">
            ✦
          </p>
          <h2 id="done-title">Your idea is on its way</h2>
          <p>Thank you for sharing it. That took courage, and we are excited to read it.</p>
          <button type="button" className="secondary" onClick={again}>
            Share another idea
          </button>
        </section>
      ) : (
        <form
          className="card"
          aria-labelledby="step-title"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 2) setStep(step + 1);
            else void send();
          }}
        >
          <ol className="pitch-steps" aria-label="Progress">
            {STEPS.map((t, i) => (
              <li
                key={t}
                aria-current={i === step ? 'step' : undefined}
                className={i <= step ? 'on' : ''}
              >
                <span>{i + 1}</span> {t}
              </li>
            ))}
          </ol>
          <h2 id="step-title">{STEPS[step]}</h2>

          {step === 0 && (
            <>
              <Field label="What should we call you?">
                {(id) => (
                  <input
                    id={id}
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="A link to your work"
                hint="Optional. A page, a repository, anything you are proud of."
              >
                {(id) => (
                  <input
                    id={id}
                    type="url"
                    placeholder="https://"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                  />
                )}
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="What is it called?" hint="A working name is fine.">
                {(id) => (
                  <input
                    id={id}
                    required
                    maxLength={80}
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Tell us about it"
                hint={`${pitch.length} of 3000 characters. What is it, and who is it for?`}
              >
                {(id) => (
                  <textarea
                    id={id}
                    required
                    rows={6}
                    maxLength={3000}
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                  />
                )}
              </Field>
              <Tiles
                label="Where would it live?"
                options={PLATFORMS}
                value={platforms}
                onChange={setPlatforms}
              />
            </>
          )}

          {step === 2 && (
            <Tiles label="What would help most?" options={HELP} value={help} onChange={setHelp} />
          )}

          <div className="row">
            {step > 0 && (
              <button type="button" className="secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button type="submit" className="primary" disabled={!ready || busy}>
              {step < 2 ? 'Next' : 'Send my idea'}
            </button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      )}

      <h2>Your ideas</h2>
      {mine.loading ? (
        <Loading what="Loading your ideas." />
      ) : mine.error ? (
        <ErrorState message={mine.error} onRetry={mine.reload} />
      ) : mine.data?.length ? (
        <ul className="pitch-list" aria-label="Your ideas">
          {mine.data.map((s) => (
            <li key={s.id} className="card">
              <strong>{s.project_name}</strong>
              <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
              {s.reviewer_notes && <p className="hint">A note from us: {s.reviewer_notes}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing here yet. Your first idea will show up here.</Empty>
      )}
      <p>
        <button type="button" className="link" onClick={() => void signOut()}>
          Sign out
        </button>
      </p>
    </>
  );
}
