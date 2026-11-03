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
interface Access {
  member_id: string;
  email: string;
  pin_set_at: string | null;
}

/** Admin only. The database refuses all of this for anyone else, whatever the screen shows. */
export function Crew() {
  const db = supabase!;
  const [note, setNote] = useState<string | null>(null);
  const [shown, setShown] = useState<{ member: string; pin: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');

  const { data, error, loading, reload } = useAsync(async () => {
    const [members, access] = await Promise.all([
      must<MemberRow[]>(db.from('members').select('*').order('created_at')),
      must<Access[]>(db.from('member_access').select('member_id, email, pin_set_at')),
    ]);
    return { members, access: new Map(access.map((a) => [a.member_id, a])) };
  }, 'crew');

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error: e } = await fn();
    setNote(e ? e.message : ok);
    if (!e) reload();
  }

  async function issue(m: MemberRow) {
    const { data: pin, error: e } = await db.rpc('issue_pin', { p_member: m.id });
    if (e) return setNote(e.message);
    setShown({ member: m.name, pin: pin as string });
    setNote(null);
    reload();
  }

  async function saveEmail(m: MemberRow, value: string) {
    const { error: e } = await db.rpc('set_member_email', { p_member: m.id, p_email: value });
    if (e) return setNote(e.message);
    setEmailFor(null);
    setNote(`${m.name}'s email is saved. Issue a PIN so they can sign in.`);
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
      <p className="hint">
        Each person signs in with their own five-character PIN, then a six-digit code sent to the
        email you set here. Issue the PIN, then pass it on privately.
      </p>
      {note && (
        <p role="status" className="hint">
          {note}
        </p>
      )}
      {shown && (
        <section className="card code-card" aria-labelledby="code-title">
          <h2 id="code-title">PIN for {shown.member}</h2>
          <p className="code mono">{shown.pin}</p>
          <p className="hint">
            Send it to them privately. It is shown only now. They set it on the five wheels (type
            &quot;cryptex&quot; on the website, or open the portal) and enter the code sent to their
            email. Reissuing replaces the old PIN.
          </p>
          <button type="button" className="secondary" onClick={() => setShown(null)}>
            Done
          </button>
        </section>
      )}
      {data.members.length === 0 && <Empty>No crew yet. Add the first member below.</Empty>}
      <ul className="rows">
        {data.members.map((m) => {
          const acc = data.access.get(m.id);
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
                <button
                  type="button"
                  className="secondary admin-only"
                  disabled={!acc}
                  title={acc ? undefined : 'Set their email first'}
                  onClick={() => issue(m)}
                >
                  {acc?.pin_set_at ? 'Reissue PIN' : 'Issue PIN'}
                </button>
                {!isAdmin && m.access_status === 'active' && (
                  <ConfirmButton
                    label="Pause access"
                    confirmLabel="Lock the account"
                    onConfirm={() =>
                      run(
                        () =>
                          db.from('members').update({ access_status: 'revoked' }).eq('id', m.id),
                        `${m.name} can no longer edit. Their profile stays.`,
                      )
                    }
                  />
                )}
                {!isAdmin && m.access_status === 'revoked' && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      run(
                        () => db.from('members').update({ access_status: 'active' }).eq('id', m.id),
                        `Access restored for ${m.name}.`,
                      )
                    }
                  >
                    Restore access
                  </button>
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
              <p className="hint">
                {acc ? (
                  <>
                    Signs in with <strong>{acc.email}</strong>
                    {acc.pin_set_at
                      ? ` · PIN set ${new Date(acc.pin_set_at).toLocaleDateString()}`
                      : ' · no PIN yet'}
                  </>
                ) : (
                  'No email yet, so they cannot sign in.'
                )}{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setEmailFor(emailFor === m.id ? null : m.id);
                    setEmailDraft(acc?.email ?? '');
                  }}
                >
                  {acc ? 'Change email' : 'Set email'}
                </button>
              </p>
              {emailFor === m.id && (
                <form
                  className="editor"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEmail(m, emailDraft);
                  }}
                >
                  <Field
                    label={`Email for ${m.name}`}
                    hint="Their GitHub email or any inbox they check. Changing it signs them out until they sign in again with a new code."
                  >
                    {(id) => (
                      <input
                        id={id}
                        type="email"
                        required
                        maxLength={200}
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                      />
                    )}
                  </Field>
                  <button type="submit" className="primary admin-only">
                    Save email
                  </button>
                </form>
              )}
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
          const { data: row, error: e1 } = await db
            .from('members')
            .insert({ name, slug: slugify(name), role_title: title })
            .select('id')
            .single();
          if (e1 || !row) return setNote(e1?.message ?? 'Could not add the member.');
          const { error: e2 } = await db.rpc('set_member_email', {
            p_member: row.id,
            p_email: email,
          });
          if (e2) return setNote(`${name} was added, but the email was refused: ${e2.message}`);
          const { data: pin, error: e3 } = await db.rpc('issue_pin', { p_member: row.id });
          if (e3) return setNote(e3.message);
          setShown({ member: name, pin: pin as string });
          setNote(null);
          setName('');
          setTitle('');
          setEmail('');
          reload();
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
        <Field label="Email" hint="Where their sign-in code is sent.">
          {(id) => (
            <input
              id={id}
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="primary admin-only" disabled={!slugify(name)}>
          Add member and issue PIN
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
