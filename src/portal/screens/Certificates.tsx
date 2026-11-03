import { useState } from 'react';
import { supabase } from '../supabase';
import type { CertificationRow, MemberRow } from '../types';
import { useAsync, must } from '../useAsync';
import { Empty, ErrorState, Field, Loading, SAVED } from '../ui';

/** Your certificates. They appear as trophies on your public profile; leave room for the ones still to come. */
export function Certificates({ me }: { me: MemberRow }) {
  const list = useAsync<CertificationRow[]>(
    async () =>
      supabase
        ? must(
            supabase
              .from('certifications')
              .select('*')
              .eq('member_id', me.id)
              .order('issued_on', { ascending: false, nullsFirst: false }),
          )
        : [],
    me.id,
  );
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issued, setIssued] = useState('');
  const [expires, setExpires] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('certifications').insert({
      member_id: me.id,
      title: title.trim(),
      issuer: issuer.trim(),
      issued_on: issued || null,
      expires_on: expires || null,
      credential_url: url.trim() || null,
    });
    if (error) return setMsg({ kind: 'error', text: error.message });
    setMsg({ kind: 'ok', text: SAVED });
    setTitle('');
    setIssuer('');
    setIssued('');
    setExpires('');
    setUrl('');
    list.reload();
  }

  async function remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('certifications').delete().eq('id', id);
    if (error) return setMsg({ kind: 'error', text: error.message });
    list.reload();
  }

  if (list.loading) return <Loading title="My certificates" what="Loading your certificates." />;
  if (list.error)
    return <ErrorState title="My certificates" message={list.error} onRetry={list.reload} />;

  return (
    <>
      <h1>My certificates</h1>
      <p className="hint">
        Each one becomes a trophy on your public profile. Add new ones whenever you earn them.
      </p>
      {list.data?.length ? (
        <ul className="cert-list" aria-label="Your certificates">
          {list.data.map((c) => (
            <li key={c.id} className="card">
              <strong>{c.title}</strong>
              <span className="hint">{[c.issuer, c.issued_on].filter(Boolean).join(' · ')}</span>
              <button type="button" className="secondary" onClick={() => void remove(c.id)}>
                Remove {c.title}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No certificates yet. The next unlock slot on your profile is waiting.</Empty>
      )}
      <form onSubmit={add} className="card" aria-labelledby="add-cert">
        <h2 id="add-cert">Add a certificate</h2>
        <Field label="Title">
          {(id) => (
            <input
              id={id}
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}
        </Field>
        <Field label="Issuer">
          {(id) => (
            <input
              id={id}
              maxLength={120}
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
          )}
        </Field>
        <Field label="Issued on">
          {(id) => (
            <input id={id} type="date" value={issued} onChange={(e) => setIssued(e.target.value)} />
          )}
        </Field>
        <Field label="Expires on" hint="Leave empty if it does not expire.">
          {(id) => (
            <input
              id={id}
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          )}
        </Field>
        <Field label="Credential link" hint="Optional.">
          {(id) => (
            <input
              id={id}
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="primary">
          Add certificate
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
    </>
  );
}
