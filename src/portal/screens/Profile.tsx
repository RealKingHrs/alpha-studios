import { useState } from 'react';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { SkillsPicker, type Skill } from '../SkillsPicker';
import { Field, SAVED } from '../ui';

const LINKS = ['github', 'linkedin', 'youtube', 'snapchat', 'instagram'] as const;

/** Edit your own profile. The database allows nothing else, whatever this screen shows. */
export function Profile({ me }: { me: MemberRow }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(me.name);
  const [role, setRole] = useState(me.role_title);
  const [bio, setBio] = useState(me.bio);
  const [codename, setCodename] = useState(me.codename ?? '');
  const [popPick, setPopPick] = useState(me.pop_pick ?? '');
  const [skills, setSkills] = useState<Skill[]>(me.skills ?? []);
  const [interests, setInterests] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaMsg, setIdeaMsg] = useState<string | null>(null);
  const [gh, setGh] = useState(me.github_username ?? '');
  const [links, setLinks] = useState<Record<string, string>>(me.links ?? {});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  /** Asks the backend for a few "about you" lines. The key lives there, never in the site. */
  async function suggest() {
    if (!supabase) return;
    setSuggesting(true);
    setIdeaMsg(null);
    const { data, error } = await supabase.functions.invoke('suggest-tagline', {
      body: { interests, name },
    });
    setSuggesting(false);
    if (error || !data?.suggestions) {
      let text = 'Suggestions are not available right now. You can write your own.';
      try {
        const body = await (error as { context?: Response } | null)?.context?.json();
        if (body?.error) text = body.error;
      } catch {
        /* keep the general message */
      }
      setIdeas([]);
      return setIdeaMsg(text);
    }
    setIdeas(data.suggestions as string[]);
    setIdeaMsg('Pick one to use it, then edit it if you like.');
  }

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
        skills,
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
      <Field label="Call sign" hint="A playful nickname shown under your name.">
        {(id) => (
          <input
            id={id}
            maxLength={40}
            value={codename}
            onChange={(e) => setCodename(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="Favourite show, film or game"
        hint="Your card gets a backdrop that nods to it. Leave empty for a surprise."
      >
        {(id) => (
          <input
            id={id}
            maxLength={80}
            value={popPick}
            onChange={(e) => setPopPick(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="About you"
        hint={`${bio.length} of 160 characters. One or two lines in your own words.`}
      >
        {(id) => (
          <textarea
            id={id}
            rows={3}
            maxLength={160}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        )}
      </Field>
      <div className="suggest">
        <Field
          label="Want help with it?"
          hint="Tell us what you enjoy building and we will suggest a few lines."
        >
          {(id) => (
            <textarea
              id={id}
              rows={2}
              maxLength={600}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          )}
        </Field>
        <button
          type="button"
          className="secondary"
          disabled={suggesting}
          onClick={() => void suggest()}
        >
          Suggest lines
        </button>
        {ideaMsg && (
          <p role="status" className="hint">
            {ideaMsg}
          </p>
        )}
        {ideas.length > 0 && (
          <ul className="idea-list" aria-label="Suggested lines">
            {ideas.map((t) => (
              <li key={t}>
                <button type="button" className="secondary" onClick={() => setBio(t.slice(0, 160))}>
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SkillsPicker value={skills} onChange={setSkills} />
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
