import { useState } from 'react';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { must, useAsync } from '../useAsync';
import { ConfirmButton, Empty, ErrorState, Field, Loading, SAVED } from '../ui';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const when = (iso: string) => new Date(iso).toLocaleString();

interface Invite {
  member_id: string;
  expires_at: string;
  used_at: string | null;
}

/** Admin only. The database refuses all of this for anyone else, whatever the screen shows. */
export function Crew() {
  const db = supabase!;
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState<{ member: string; code: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');

  const { data, error, loading, reload } = useAsync(async () => {
    const [members, invites] = await Promise.all([
      must<MemberRow[]>(db.from('members').select('*').order('created_at')),
      must<Invite[]>(
        db
          .from('invites')
          .select('member_id, expires_at, used_at')
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString()),
      ),
    ]);
    return { members, pending: new Map(invites.map((i) => [i.member_id, i])) };
  }, 'crew');

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error: e } = await fn();
    setNote(e ? e.message : ok);
    if (!e) reload();
  }

  async function issue(m: MemberRow) {
    const { data: c, error: e } = await db.rpc('issue_invite', { p_member: m.id });
    if (e) return setNote(e.message);
    setCode({ member: m.name, code: c as string });
    setNote(null);
    reload();
  }

  if (loading) return <Loading what="Loading the crew." title="Crew" />;
  if (error || !data)
    return (
      <ErrorState
        message={error ?? 'The crew could not be loaded.'}
        onRetry={reload}
        title="Crew"
      />
    );

  return (
    <>
      <h1>Crew</h1>
      {note && (
        <p role="status" className="hint">
          {note}
        </p>
      )}
      {code && (
        <section className="card code-card" aria-labelledby="code-title">
          <h2 id="code-title">Invite code for {code.member}</h2>
          <p className="code mono">{code.code}</p>
          <p className="hint">
            Send it to them privately. It is shown only now, works once and expires in seven days.
          </p>
          <button type="button" className="secondary" onClick={() => setCode(null)}>
            Done
          </button>
        </section>
      )}
      {data.members.length === 0 && <Empty>No crew yet. Add the first member below.</Empty>}
      <ul className="rows">
        {data.members.map((m) => {
          const pending = data.pending.get(m.id);
          const isAdmin = m.role === 'admin';
          return (
            <li key={m.id} className="row">
              <div className="row-head">
                <strong>{m.name}</strong>
                <span className="mono hint">{m.role_title || 'No role set'}</span>
                <span className={`badge ${isAdmin ? 'admin-only' : ''}`}>
                  {isAdmin ? 'Admin' : m.access_status}
                </span>
                <span className="grow" />
                {!isAdmin && (
                  <>
                    <button type="button" className="secondary admin-only" onClick={() => issue(m)}>
                      {m.access_status === 'invited' && !pending
                        ? 'Issue invite'
                        : 'Reissue invite'}
                    </button>
                    {pending && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          run(
                            () =>
                              db
                                .from('invites')
                                .update({ expires_at: new Date().toISOString() })
                                .eq('member_id', m.id)
                                .is('used_at', null),
                            'The invite was revoked.',
                          )
                        }
                      >
                        Revoke invite
                      </button>
                    )}
                    {m.access_status === 'active' && (
                      <ConfirmButton
                        label="Revoke access"
                        confirmLabel="Lock the account"
                        onConfirm={() =>
                          run(
                            () =>
                              db
                                .from('members')
                                .update({ access_status: 'revoked' })
                                .eq('id', m.id),
                            `${m.name} can no longer sign in to edit. Their profile stays.`,
                          )
                        }
                      />
                    )}
                    {m.access_status === 'revoked' && m.user_id && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          run(
                            () =>
                              db.from('members').update({ access_status: 'active' }).eq('id', m.id),
                            `Access restored for ${m.name}.`,
                          )
                        }
                      >
                        Restore access
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  className="secondary"
                  aria-expanded={editing === m.id}
                  onClick={() => setEditing(editing === m.id ? null : m.id)}
                >
                  {editing === m.id ? 'Close' : 'Edit'}
                </button>
                {!isAdmin && (
                  <ConfirmButton
                    label="Remove profile"
                    confirmLabel={`Remove ${m.name}`}
                    className="secondary admin-only"
                    onConfirm={() =>
                      run(
                        () => db.from('members').delete().eq('id', m.id),
                        `${m.name} was removed. You can undo it in the audit log.`,
                      )
                    }
                  />
                )}
              </div>
              {pending && <p className="hint">Invite pending until {when(pending.expires_at)}.</p>}
              {editing === m.id && (
                <MemberEditor
                  key={m.id}
                  member={m}
                  onSaved={() => {
                    setNote(SAVED);
                    reload();
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          await run(
            () => db.from('members').insert({ name, slug: slugify(name), role_title: title }),
            `${name} was added. Issue an invite so they can join.`,
          );
          setName('');
          setTitle('');
        }}
      >
        <h2>Add a crew member</h2>
        <Field label="Name">
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
        <Field label="Role">
          {(id) => (
            <input
              id={id}
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="primary admin-only" disabled={!slugify(name)}>
          Add member
        </button>
      </form>
    </>
  );
}

function MemberEditor({ member: m, onSaved }: { member: MemberRow; onSaved: () => void }) {
  const [d, setD] = useState({
    name: m.name,
    role_title: m.role_title,
    bio: m.bio,
    github_username: m.github_username ?? '',
  });
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="editor"
      onSubmit={async (e) => {
        e.preventDefault();
        const { data, error } = await supabase!
          .from('members')
          .update({ ...d, github_username: d.github_username.trim() || null })
          .eq('id', m.id)
          .select('id');
        if (error) return setErr(error.message);
        if (!data?.length) return setErr('This profile could not be saved.');
        setErr(null);
        onSaved();
      }}
    >
      <Field label="Name">
        {(id) => (
          <input
            id={id}
            required
            maxLength={80}
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
          />
        )}
      </Field>
      <Field label="Role">
        {(id) => (
          <input
            id={id}
            maxLength={80}
            value={d.role_title}
            onChange={(e) => setD({ ...d, role_title: e.target.value })}
          />
        )}
      </Field>
      <Field label="Bio">
        {(id) => (
          <textarea
            id={id}
            rows={4}
            maxLength={1000}
            value={d.bio}
            onChange={(e) => setD({ ...d, bio: e.target.value })}
          />
        )}
      </Field>
      <Field label="GitHub username">
        {(id) => (
          <input
            id={id}
            value={d.github_username}
            onChange={(e) => setD({ ...d, github_username: e.target.value })}
          />
        )}
      </Field>
      <button type="submit" className="primary admin-only">
        Save member
      </button>
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
    </form>
  );
}
