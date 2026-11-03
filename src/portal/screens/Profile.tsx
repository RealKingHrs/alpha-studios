import { useState } from 'react';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { Field, SAVED } from '../ui';

/** "Backend:5, Postgres:4" to skills, keeping only valid names and levels 1 to 5. */
export function parseSkills(text: string) {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((part) => {
      const [name, level] = part.split(':').map((x) => x.trim());
      return { name, level: Math.min(5, Math.max(1, Number.parseInt(level ?? '3', 10) || 3)) };
    })
    .filter((x) => x.name);
}

const LINKS = ['github', 'linkedin', 'youtube', 'snapchat', 'instagram'] as const;

/** Edit your own profile. The database allows nothing else, whatever this screen shows. */
export function Profile({ me }: { me: MemberRow }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(me.name);
  const [role, setRole] = useState(me.role_title);
  const [bio, setBio] = useState(me.bio);
  const [codename, setCodename] = useState(me.codename ?? '');
  const [tagline, setTagline] = useState(me.tagline ?? '');
  const [skills, setSkills] = useState(
    (me.skills ?? []).map((x) => `${x.name}:${x.level}`).join(', '),
  );
  const [currently, setCurrently] = useState(me.currently ?? '');
  const [funFact, setFunFact] = useState(me.fun_fact ?? '');
  const [popPick, setPopPick] = useState(me.pop_pick ?? '');
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
      .update({
        name,
        role_title: role,
        bio,
        github_username: gh.trim() || null,
        links: clean,
        codename,
        tagline,
        skills: parseSkills(skills),
        currently,
        fun_fact: funFact,
        pop_pick: popPick,
      })
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
      <Field label="Codename" hint="A playful alias shown on your card.">
        {(id) => (
          <input
            id={id}
            maxLength={40}
            value={codename}
            onChange={(e) => setCodename(e.target.value)}
          />
        )}
      </Field>
      <Field label="Tagline" hint="One line, up to 120 characters.">
        {(id) => (
          <input
            id={id}
            maxLength={120}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="Skills"
        hint="Name and level from 1 to 5, separated by commas. Example: React:5, Swift:3"
      >
        {(id) => <input id={id} value={skills} onChange={(e) => setSkills(e.target.value)} />}
      </Field>
      <Field label="Currently working on">
        {(id) => (
          <input
            id={id}
            maxLength={160}
            value={currently}
            onChange={(e) => setCurrently(e.target.value)}
          />
        )}
      </Field>
      <Field label="Fun fact">
        {(id) => (
          <input
            id={id}
            maxLength={200}
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
          />
        )}
      </Field>
      <Field label="Pop pick" hint="A favourite show or game.">
        {(id) => (
          <input
            id={id}
            maxLength={80}
            value={popPick}
            onChange={(e) => setPopPick(e.target.value)}
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
