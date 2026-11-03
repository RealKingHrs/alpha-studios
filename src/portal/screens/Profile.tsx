import { useState } from 'react';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { Field, SAVED } from '../ui';

const LINKS = ['github', 'linkedin', 'youtube', 'snapchat', 'instagram'] as const;

/** Edit your own profile. The database allows nothing else, whatever this screen shows. */
export function Profile({ me }: { me: MemberRow }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(me.name);
  const [role, setRole] = useState(me.role_title);
  const [bio, setBio] = useState(me.bio);
  const [gh, setGh] = useState(me.github_username ?? '');
  const [links, setLinks] = useState<Record<string, string>>(me.links ?? {});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const clean = Object.fromEntries(Object.entries(links).filter(([, v]) => v.trim() !== ''));
    const { data, error } = await supabase
      .from('members')
      .update({ name, role_title: role, bio, github_username: gh.trim() || null, links: clean })
      .eq('id', me.id)
      .select('id');
    setBusy(false);
    if (error) return setMsg({ kind: 'error', text: error.message });
    if (!data?.length)
      return setMsg({
        kind: 'error',
        text: 'Your profile could not be saved. Sign in again and retry.',
      });
    setMsg({ kind: 'ok', text: SAVED });
    await refresh();
  }

  return (
    <form onSubmit={save} className="card" aria-labelledby="profile-title">
      <h1 id="profile-title">My profile</h1>
      <p className="hint">
        These details are shown publicly. You agreed to that on{' '}
        {me.consented_at ? new Date(me.consented_at).toLocaleDateString() : 'joining'}.
      </p>
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
          <input id={id} maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} />
        )}
      </Field>
      <Field
        label="Bio"
        hint={`${bio.length} of 1000 characters. About 40 to 60 words reads well.`}
      >
        {(id) => (
          <textarea
            id={id}
            rows={5}
            maxLength={1000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        )}
      </Field>
      <Field label="GitHub username" hint="Used to show you as a contributor on project rooms.">
        {(id) => (
          <input id={id} autoCapitalize="none" value={gh} onChange={(e) => setGh(e.target.value)} />
        )}
      </Field>
      {LINKS.map((k) => (
        <Field
          key={k}
          label={`${k[0].toUpperCase()}${k.slice(1)} link`}
          hint="Leave empty to hide it."
        >
          {(id) => (
            <input
              id={id}
              type="url"
              placeholder="https://"
              value={links[k] ?? ''}
              onChange={(e) => setLinks({ ...links, [k]: e.target.value })}
            />
          )}
        </Field>
      ))}
      <button type="submit" className="primary" disabled={busy}>
        Save profile
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
  );
}
