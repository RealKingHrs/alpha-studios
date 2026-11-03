import { useState } from 'react';
import { supabase } from '../supabase';
import type { SubmissionRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';

export const STATUS_LABEL: Record<SubmissionRow['status'], string> = {
  new: 'Sent',
  reviewing: 'Being looked at',
  approved: 'Approved',
  declined: 'Not this time',
};

const HELP = ['funding', 'backend', 'frontend', 'design', 'launch', 'mentoring'] as const;
const PLATFORMS = ['ios', 'macos', 'android', 'web'] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Launchpad ideas. Everyone on the crew can read them. Only the admin can log an idea that arrived by email, leave
 * notes, decline, or approve and adopt one.
 */
export function Submissions({ admin }: { admin: boolean }) {
  const list = useAsync<SubmissionRow[]>(
    async () =>
      supabase
        ? must(supabase.from('submissions').select('*').order('created_at', { ascending: false }))
        : [],
    'all',
  );
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function update(
    id: string,
    patch: Partial<Pick<SubmissionRow, 'status' | 'reviewer_notes'>>,
  ) {
    if (!supabase) return;
    const { error } = await supabase.from('submissions').update(patch).eq('id', id);
    if (error) return setMsg({ kind: 'error', text: error.message });
    setMsg(null);
    list.reload();
  }

  async function approve(s: SubmissionRow) {
    if (!supabase) return;
    const base = slugify(s.project_name) || 'project';
    const stamp = Date.now().toString(36).slice(-4);
    const { data, error } = await supabase.rpc('approve_submission', {
      p_id: s.id,
      p_slug: `${base}-${stamp}`.slice(0, 60),
      p_member_slug: `${slugify(s.pitcher_name) || 'founder'}-${stamp}`.slice(0, 60),
    });
    if (error || !data?.ok)
      return setMsg({ kind: 'error', text: error?.message ?? data?.error ?? 'Could not approve.' });
    setMsg({
      kind: 'ok',
      text: `Approved. ${s.project_name} is now a project, and ${s.pitcher_name}'s founder credit is locked. Open Crew to add ${s.pitcher_name}'s email and issue a PIN so they can claim their profile.`,
    });
    list.reload();
  }

  if (list.loading) return <Loading title="Launchpad submissions" what="Loading submissions." />;
  if (list.error)
    return <ErrorState title="Launchpad submissions" message={list.error} onRetry={list.reload} />;

  return (
    <>
      <h1>Launchpad ideas</h1>
      <p className="hint">
        {admin
          ? "Ideas arrive by email from the Launchpad page. Log each one here so the crew can read it. Approving creates the project with the founder's credit locked, and a profile for the founder. Ownership and support terms are agreed in writing outside this tool."
          : 'Ideas people have pitched to Launchpad. You can read them here; the admin decides what happens next.'}
      </p>
      {admin && <LogIdea onLogged={list.reload} />}
      {msg && (
        <p
          role={msg.kind === 'error' ? 'alert' : 'status'}
          className={msg.kind === 'error' ? 'error' : 'hint'}
        >
          {msg.text}
        </p>
      )}
      {list.data?.length ? (
        <ul className="pitch-list" aria-label="Submissions">
          {list.data.map((s) => (
            <SubmissionCard key={s.id} s={s} admin={admin} onUpdate={update} onApprove={approve} />
          ))}
        </ul>
      ) : (
        <Empty>No ideas yet.</Empty>
      )}
    </>
  );
}

function SubmissionCard({
  s,
  admin,
  onUpdate,
  onApprove,
}: {
  s: SubmissionRow;
  admin: boolean;
  onUpdate: (
    id: string,
    patch: Partial<Pick<SubmissionRow, 'status' | 'reviewer_notes'>>,
  ) => Promise<void>;
  onApprove: (s: SubmissionRow) => Promise<void>;
}) {
  const [notes, setNotes] = useState(s.reviewer_notes);
  const open = admin && (s.status === 'new' || s.status === 'reviewing');
  return (
    <li className="card">
      <h2>{s.project_name}</h2>
      <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
      <p className="hint">
        From {s.pitcher_name} ({s.contact_email || 'no email'}) ·{' '}
        {s.platforms.join(', ') || 'no platform'} · wants{' '}
        {s.help_wanted.join(', ') || 'nothing specific'}
      </p>
      <p className="pitch-body">{s.pitch}</p>
      {!admin && s.reviewer_notes && (
        <p className="hint">Note from the admin: {s.reviewer_notes}</p>
      )}
      {open && (
        <>
          <Field label={`Notes for ${s.project_name}`} hint="The pitcher can read these.">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </Field>
          <div className="row">
            <button
              type="button"
              className="secondary"
              onClick={() => void onUpdate(s.id, { status: 'reviewing', reviewer_notes: notes })}
            >
              Save notes and mark reviewing
            </button>
            <ConfirmButton
              label="Decline"
              confirmLabel={`Decline ${s.project_name}`}
              onConfirm={() => void onUpdate(s.id, { status: 'declined', reviewer_notes: notes })}
            />
            <ConfirmButton
              className="primary"
              label="Approve and adopt"
              confirmLabel={`Adopt ${s.project_name}`}
              onConfirm={() => void onApprove(s)}
            />
          </div>
        </>
      )}
    </li>
  );
}

/** Admin: log an idea that arrived by email, so it shows up for the crew to read. */
function LogIdea({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    pitcher_name: '',
    contact_email: '',
    project_name: '',
    pitch: '',
    platforms: [] as string[],
    help_wanted: [] as string[],
  });
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const toggle = (key: 'platforms' | 'help_wanted', v: string) =>
    setF((x) => ({
      ...x,
      [key]: x[key].includes(v) ? x[key].filter((y) => y !== v) : [...x[key], v],
    }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('submissions').insert(f);
    if (error) return setNote({ kind: 'error', text: error.message });
    setNote({ kind: 'ok', text: `${f.project_name} is logged.` });
    setF({
      pitcher_name: '',
      contact_email: '',
      project_name: '',
      pitch: '',
      platforms: [],
      help_wanted: [],
    });
    onLogged();
  }

  return (
    <section className="panel admin-only" aria-label="Log an idea">
      <button
        type="button"
        className="secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Log an idea from an email'}
      </button>
      {note && (
        <p
          role={note.kind === 'error' ? 'alert' : 'status'}
          className={note.kind === 'error' ? 'error' : 'hint'}
        >
          {note.text}
        </p>
      )}
      {open && (
        <form onSubmit={save}>
          <Field label="Their name">
            {(id) => (
              <input
                id={id}
                required
                maxLength={80}
                value={f.pitcher_name}
                onChange={(e) => setF({ ...f, pitcher_name: e.target.value })}
              />
            )}
          </Field>
          <Field label="Their email">
            {(id) => (
              <input
                id={id}
                type="email"
                maxLength={200}
                value={f.contact_email}
                onChange={(e) => setF({ ...f, contact_email: e.target.value })}
              />
            )}
          </Field>
          <Field label="Idea name">
            {(id) => (
              <input
                id={id}
                required
                maxLength={80}
                value={f.project_name}
                onChange={(e) => setF({ ...f, project_name: e.target.value })}
              />
            )}
          </Field>
          <Field label="What it is">
            {(id) => (
              <textarea
                id={id}
                required
                rows={4}
                maxLength={3000}
                value={f.pitch}
                onChange={(e) => setF({ ...f, pitch: e.target.value })}
              />
            )}
          </Field>
          <fieldset>
            <legend>Platforms</legend>
            {PLATFORMS.map((p) => (
              <label key={p} className="check">
                <input
                  type="checkbox"
                  checked={f.platforms.includes(p)}
                  onChange={() => toggle('platforms', p)}
                />{' '}
                {p}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Help they want</legend>
            {HELP.map((p) => (
              <label key={p} className="check">
                <input
                  type="checkbox"
                  checked={f.help_wanted.includes(p)}
                  onChange={() => toggle('help_wanted', p)}
                />{' '}
                {p}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="primary admin-only">
            Log the idea
          </button>
        </form>
      )}
    </section>
  );
}
