import { useState } from 'react';
import { supabase } from '../supabase';
import type { SubmissionRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { STATUS_LABEL } from './Pitch';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Admin: read every Launchpad pitch, leave notes, decline, or approve and adopt it. */
export function Submissions() {
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
      text: `Approved. ${s.project_name} is now a project, and ${s.pitcher_name}'s founder credit is locked. Open Crew to issue ${s.pitcher_name} an invite so they can claim their profile.`,
    });
    list.reload();
  }

  if (list.loading) return <Loading title="Launchpad submissions" what="Loading submissions." />;
  if (list.error)
    return <ErrorState title="Launchpad submissions" message={list.error} onRetry={list.reload} />;

  return (
    <>
      <h1>Launchpad submissions</h1>
      <p className="hint">
        Approving creates the project with the founder&apos;s credit locked, and a profile for the
        founder. Ownership and support terms are agreed in writing outside this tool.
      </p>
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
            <SubmissionCard key={s.id} s={s} onUpdate={update} onApprove={approve} />
          ))}
        </ul>
      ) : (
        <Empty>No pitches yet.</Empty>
      )}
    </>
  );
}

function SubmissionCard({
  s,
  onUpdate,
  onApprove,
}: {
  s: SubmissionRow;
  onUpdate: (
    id: string,
    patch: Partial<Pick<SubmissionRow, 'status' | 'reviewer_notes'>>,
  ) => Promise<void>;
  onApprove: (s: SubmissionRow) => Promise<void>;
}) {
  const [notes, setNotes] = useState(s.reviewer_notes);
  const open = s.status === 'new' || s.status === 'reviewing';
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
