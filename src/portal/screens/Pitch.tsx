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
  reviewing: 'Being reviewed',
  approved: 'Approved',
  declined: 'Not this time',
};

/** A grid of pressable tiles, like slots to fill. Pressed tiles are the chosen ones. */
function Slots({
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

/** Anyone signed in can pitch a project, with or without a crew profile. Pitches are private to the pitcher and the admin. */
export function Pitch({ email: known = '', name: given = '' }: { email?: string; name?: string }) {
  const { signOut } = useAuth();
  const session = useAsync<string>(
    async () => known || (await supabase?.auth.getSession())?.data.session?.user.email || '',
    'email',
  );
  const email = session.data ?? known;
  const mine = useAsync<SubmissionRow[]>(
    async () =>
      supabase
        ? must(supabase.from('submissions').select('*').order('created_at', { ascending: false }))
        : [],
    'mine',
  );
  const [name, setName] = useState(given);
  const [project, setProject] = useState('');
  const [pitch, setPitch] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [help, setHelp] = useState<string[]>([]);
  const [site, setSite] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from('submissions').insert({
      pitcher_name: name.trim(),
      contact_email: email,
      project_name: project.trim(),
      pitch: pitch.trim(),
      platforms,
      help_wanted: help,
      links: site.trim() ? { site: site.trim() } : {},
    });
    setBusy(false);
    if (error) return setMsg({ kind: 'error', text: error.message });
    setMsg({
      kind: 'ok',
      text: 'Pitch sent. The team reads every one, and you will see its status below.',
    });
    setProject('');
    setPitch('');
    setPlatforms([]);
    setHelp([]);
    setSite('');
    mine.reload();
  }

  return (
    <>
      <h1>Pitch a project</h1>
      <p className="hint">
        Signed in as {email}. Tell us what you are building and where you are stuck. If the team
        approves, we adopt it and credit you as its founder, permanently. Terms are agreed in
        writing before anything is adopted, so pitching commits nobody.
      </p>
      <form onSubmit={send} className="card" aria-labelledby="pitch-form">
        <h2 id="pitch-form">The idea</h2>
        <Field label="Your name">
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
        <Field label="Project name">
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
          label="The pitch"
          hint={`${pitch.length} of 3000 characters. What is it, who is it for, how far along are you?`}
        >
          {(id) => (
            <textarea
              id={id}
              required
              rows={7}
              maxLength={3000}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
            />
          )}
        </Field>
        <Slots label="Platforms" options={PLATFORMS} value={platforms} onChange={setPlatforms} />
        <Slots label="What help do you want?" options={HELP} value={help} onChange={setHelp} />
        <Field label="A link" hint="Optional: a repository, prototype or page.">
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
        <button type="submit" className="primary" disabled={busy}>
          Send the pitch
        </button>
        {msg && (
          <p
            role={msg.kind === 'error' ? 'alert' : 'status'}
            className={msg.kind === 'error' ? 'error' : 'hint'}
          >
            {msg.text}
          </p>
        )}
      </form>

      <h2>Your pitches</h2>
      {mine.loading ? (
        <Loading what="Loading your pitches." />
      ) : mine.error ? (
        <ErrorState message={mine.error} onRetry={mine.reload} />
      ) : mine.data?.length ? (
        <ul className="pitch-list" aria-label="Your pitches">
          {mine.data.map((s) => (
            <li key={s.id} className="card">
              <strong>{s.project_name}</strong>
              <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
              {s.reviewer_notes && <p className="hint">Team notes: {s.reviewer_notes}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No pitches yet.</Empty>
      )}
      {!given && (
        <p>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </p>
      )}
    </>
  );
}
