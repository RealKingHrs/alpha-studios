import { useState } from 'react';
import { supabase } from '../supabase';
import { must, useAsync } from '../useAsync';
import { ErrorState, Field, Loading, SAVED } from '../ui';

interface Settings {
  studio_statement: string;
  contact_email: string | null;
  intro_enabled: boolean;
}

export function SettingsScreen() {
  const { data, error, loading, reload } = useAsync(
    () =>
      must<Settings>(
        supabase!
          .from('site_settings')
          .select('studio_statement, contact_email, intro_enabled')
          .eq('id', 1)
          .single(),
      ),
    'settings',
  );
  if (loading) return <Loading what="Loading site settings." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Settings could not be loaded.'} onRetry={reload} />;
  return <SettingsForm initial={data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [d, setD] = useState({ ...initial, contact_email: initial.contact_email ?? '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  return (
    <form
      className="card"
      aria-labelledby="settings-title"
      onSubmit={async (e) => {
        e.preventDefault();
        const { data, error } = await supabase!
          .from('site_settings')
          .update({
            studio_statement: d.studio_statement,
            contact_email: d.contact_email.trim() || null,
            intro_enabled: d.intro_enabled,
          })
          .eq('id', 1)
          .select('id');
        if (error) return setMsg({ kind: 'error', text: error.message });
        if (!data?.length) return setMsg({ kind: 'error', text: 'Settings could not be saved.' });
        setMsg({ kind: 'ok', text: SAVED });
      }}
    >
      <h1 id="settings-title">Site settings</h1>
      <Field
        label="Studio statement"
        hint="Two or three sentences about what Alpha Studios builds and how."
      >
        {(id) => (
          <textarea
            id={id}
            rows={4}
            value={d.studio_statement}
            onChange={(e) => setD({ ...d, studio_statement: e.target.value })}
          />
        )}
      </Field>
      <Field label="Contact email">
        {(id) => (
          <input
            id={id}
            type="email"
            value={d.contact_email}
            onChange={(e) => setD({ ...d, contact_email: e.target.value })}
          />
        )}
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={d.intro_enabled}
          onChange={(e) => setD({ ...d, intro_enabled: e.target.checked })}
        />
        <span>Play the opening animation</span>
      </label>
      <p className="hint">Sound is always off until a visitor turns it on.</p>
      <button type="submit" className="primary admin-only">
        Save settings
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
