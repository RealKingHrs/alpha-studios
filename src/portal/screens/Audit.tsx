import { useState } from 'react';
import { supabase } from '../supabase';
import type { AuditRow, MemberRow } from '../types';
import { must, useAsync } from '../useAsync';
import { ConfirmButton, Empty, ErrorState, Loading } from '../ui';

const REVERTIBLE = new Set(['members', 'projects', 'project_members', 'site_settings']);
const NOISE = new Set(['id', 'created_at', 'user_id']);

/** One plain sentence for what a change did. */
export function describe(
  a: Pick<AuditRow, 'action' | 'table_name' | 'previous' | 'new'>,
  names: { members?: Map<string, string>; projects?: Map<string, string> } = {},
): string {
  if (a.table_name === 'project_members' && (a.action === 'INSERT' || a.action === 'DELETE')) {
    const r = (a.action === 'INSERT' ? a.new : a.previous) ?? {};
    const who = names.members?.get(r.member_id as string) ?? 'a member';
    const what = names.projects?.get(r.project_id as string) ?? 'a project';
    return a.action === 'INSERT' ? `${who} joined ${what}` : `${who} left ${what}`;
  }
  const label = (r: Record<string, unknown> | null) =>
    (r && ((r.name as string) || (r.slug as string))) || 'an item';
  if (a.action === 'ISSUE_INVITE') return 'Issued an invite code';
  const table = a.table_name.replace('_', ' ');
  if (a.action === 'INSERT') return `Added ${table}: ${label(a.new)}`;
  if (a.action === 'DELETE') return `Removed ${table}: ${label(a.previous)}`;
  const prev = a.previous ?? {};
  const next = a.new ?? {};
  const changed = Object.keys(next).filter(
    (k) => !NOISE.has(k) && JSON.stringify(prev[k]) !== JSON.stringify(next[k]),
  );
  return `Changed ${table} ${label(next)}: ${changed.length ? changed.join(', ') : 'no visible fields'}`;
}

export function Audit() {
  const db = supabase!;
  const [note, setNote] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(async () => {
    const [log, members, projects] = await Promise.all([
      must<AuditRow[]>(
        db.from('audit_log').select('*').order('id', { ascending: false }).limit(100),
      ),
      must<MemberRow[]>(db.from('members').select('id, user_id, name')),
      must<Array<{ id: string; name: string }>>(db.from('projects').select('id, name')),
    ]);
    return {
      log,
      who: new Map(members.filter((m) => m.user_id).map((m) => [m.user_id as string, m.name])),
      names: {
        members: new Map(members.map((m) => [m.id, m.name])),
        projects: new Map(projects.map((p) => [p.id, p.name])),
      },
    };
  }, 'audit');

  if (loading) return <Loading what="Loading the audit log." />;
  if (error || !data)
    return <ErrorState message={error ?? 'The audit log could not be loaded.'} onRetry={reload} />;

  async function revert(id: number) {
    const { data: res, error: e } = await db.rpc('revert_audit', { p_id: id });
    setNote(e ? e.message : res?.ok ? 'Change reverted.' : (res?.error ?? 'Could not revert.'));
    reload();
  }

  return (
    <>
      <h1>Audit log</h1>
      <p className="hint">
        Every change by crew or the admin, newest first. Reverting restores the previous value and
        is recorded too.
      </p>
      {note && (
        <p role="status" className="hint">
          {note}
        </p>
      )}
      {data.log.length === 0 && <Empty>No changes recorded yet.</Empty>}
      <ul className="rows">
        {data.log.map((a) => (
          <li key={a.id} className="row">
            <div className="row-head">
              <span className="mono hint">{new Date(a.at).toLocaleString()}</span>
              <strong>{(a.actor && data.who.get(a.actor)) || 'System'}</strong>
              <span className="grow" />
              {a.reverted_at ? (
                <span className="badge">Reverted</span>
              ) : (
                REVERTIBLE.has(a.table_name) &&
                a.action !== 'ISSUE_INVITE' && (
                  <ConfirmButton
                    label="Revert"
                    confirmLabel="Revert this change"
                    className="secondary admin-only"
                    onConfirm={() => revert(a.id)}
                  />
                )
              )}
            </div>
            <p>{describe(a, data.names)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
