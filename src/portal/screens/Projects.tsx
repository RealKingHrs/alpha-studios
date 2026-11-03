import { useState } from 'react';
import { supabase } from '../supabase';
import type { MemberRow, ProjectRow } from '../types';
import { must, useAsync } from '../useAsync';
import { ConfirmButton, Empty, ErrorState, Field, Loading, SAVED } from '../ui';

const PLATFORMS = ['ios', 'macos', 'android', 'web'] as const;
const DEVICES = ['iphone', 'android', 'mac', 'browser'] as const;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function Projects({ me }: { me: MemberRow }) {
  const admin = me.role === 'admin';
  const db = supabase!;
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const [projects, mine] = await Promise.all([
      must<ProjectRow[]>(db.from('projects').select('*').order('created_at')),
      must<Array<{ project_id: string; role: string }>>(
        db.from('project_members').select('project_id, role').eq('member_id', me.id),
      ),
    ]);
    return { projects, mine: new Map(mine.map((m) => [m.project_id, m.role])) };
  }, 'projects');

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, ok?: string) {
    const { error: e } = await fn();
    setNote(e ? e.message : (ok ?? null));
    if (!e) reload();
  }

  if (loading) return <Loading what="Loading projects." title="Projects" />;
  if (error || !data)
    return (
      <ErrorState
        message={error ?? 'Projects could not be loaded.'}
        onRetry={reload}
        title="Projects"
      />
    );

  return (
    <>
      <h1>Projects</h1>
      {note && (
        <p role="status" className="hint">
          {note}
        </p>
      )}
      {data.projects.length === 0 && (
        <Empty>No projects yet.{admin ? ' Add the first one below.' : ''}</Empty>
      )}
      <ul className="rows">
        {data.projects.map((p) => {
          const member = data.mine.has(p.id);
          const canEdit = admin || member;
          return (
            <li key={p.id} className="row">
              <div className="row-head">
                <strong>{p.name}</strong>
                <span className="mono hint">{p.status}</span>
                <span className="grow" />
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    act(
                      () =>
                        member
                          ? db
                              .from('project_members')
                              .delete()
                              .eq('project_id', p.id)
                              .eq('member_id', me.id)
                          : db
                              .from('project_members')
                              .insert({ project_id: p.id, member_id: me.id }),
                      member ? `You left ${p.name}.` : `You joined ${p.name}.`,
                    )
                  }
                >
                  {member ? 'Leave project' : 'Join project'}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="secondary"
                    aria-expanded={editing === p.id}
                    onClick={() => setEditing(editing === p.id ? null : p.id)}
                  >
                    {editing === p.id ? 'Close' : 'Edit details'}
                  </button>
                )}
                {admin && (
                  <ConfirmButton
                    label="Delete"
                    confirmLabel={`Delete ${p.name}`}
                    className="secondary admin-only"
                    onConfirm={() =>
                      act(
                        () => db.from('projects').delete().eq('id', p.id),
                        `${p.name} was deleted. You can undo it in the audit log.`,
                      )
                    }
                  />
                )}
              </div>
              {member && (
                <RoleField
                  key={`${p.id}-${data.mine.get(p.id) ?? ''}`}
                  project={p.name}
                  initial={data.mine.get(p.id) ?? ''}
                  onSave={(role) =>
                    act(
                      () =>
                        db
                          .from('project_members')
                          .update({ role })
                          .eq('project_id', p.id)
                          .eq('member_id', me.id),
                      `Your role on ${p.name} is saved.`,
                    )
                  }
                />
              )}
              {editing === p.id && (
                <ProjectEditor
                  key={p.id}
                  project={p}
                  admin={admin}
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

      {admin && (
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            await act(
              () => db.from('projects').insert({ name: newName, slug: slugify(newName) }),
              `${newName} was added.`,
            );
            setNewName('');
          }}
        >
          <h2>Add a project</h2>
          <Field label="Project name" hint="The address is made from the name.">
            {(id) => (
              <input
                id={id}
                required
                maxLength={80}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            )}
          </Field>
          <button type="submit" className="primary admin-only" disabled={!slugify(newName)}>
            Add project
          </button>
        </form>
      )}
    </>
  );
}

function ProjectEditor({
  project: p,
  admin,
  onSaved,
}: {
  project: ProjectRow;
  admin: boolean;
  onSaved: () => void;
}) {
  const [d, setD] = useState({
    name: p.name,
    summary: p.summary,
    story: p.story,
    status: p.status,
    platforms: p.platforms,
    tech: p.tech.join(', '),
    links: p.links ?? {},
    repo: p.repo ?? '',
    featured: p.featured,
    screenshots: p.screenshots ?? [],
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD({ ...d, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const links = Object.fromEntries(Object.entries(d.links).filter(([, v]) => v.trim() !== ''));
    const patch: Record<string, unknown> = {
      name: d.name,
      summary: d.summary,
      story: d.story,
      status: d.status,
      platforms: d.platforms,
      tech: d.tech
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      links,
      repo: d.repo.trim() || null,
      screenshots: d.screenshots,
    };
    if (admin) patch.featured = d.featured;
    const { data, error } = await supabase!
      .from('projects')
      .update(patch)
      .eq('id', p.id)
      .select('id');
    setBusy(false);
    if (error) return setErr(error.message);
    if (!data?.length)
      return setErr('These details could not be saved. You may no longer be on this project.');
    setErr(null);
    onSaved();
  }

  return (
    <form onSubmit={save} className="editor">
      <Field label="Name">
        {(id) => (
          <input
            id={id}
            required
            maxLength={80}
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
          />
        )}
      </Field>
      <Field label="Summary" hint="One line.">
        {(id) => (
          <input
            id={id}
            maxLength={200}
            value={d.summary}
            onChange={(e) => set('summary', e.target.value)}
          />
        )}
      </Field>
      <Field
        label="Story"
        hint={`${d.story.split(/\s+/).filter(Boolean).length} words. 80 to 120 reads well.`}
      >
        {(id) => (
          <textarea
            id={id}
            rows={6}
            maxLength={3000}
            value={d.story}
            onChange={(e) => set('story', e.target.value)}
          />
        )}
      </Field>
      <Field label="Status">
        {(id) => (
          <select
            id={id}
            value={d.status}
            onChange={(e) => set('status', e.target.value as ProjectRow['status'])}
          >
            <option value="live">Live</option>
            <option value="beta">Beta</option>
            <option value="in-development">In development</option>
          </select>
        )}
      </Field>
      <fieldset className="plain">
        <legend>Platforms</legend>
        {PLATFORMS.map((x) => (
          <label key={x} className="check">
            <input
              type="checkbox"
              checked={d.platforms.includes(x)}
              onChange={(e) =>
                set(
                  'platforms',
                  e.target.checked ? [...d.platforms, x] : d.platforms.filter((y) => y !== x),
                )
              }
            />
            <span>{x}</span>
          </label>
        ))}
      </fieldset>
      <Field label="Tech used" hint="Separate with commas.">
        {(id) => <input id={id} value={d.tech} onChange={(e) => set('tech', e.target.value)} />}
      </Field>
      {(['appStore', 'playStore', 'github', 'demo'] as const).map((k) => (
        <Field
          key={k}
          label={
            {
              appStore: 'App Store link',
              playStore: 'Play Store link',
              github: 'GitHub link',
              demo: 'Live site link',
            }[k]
          }
          hint="Leave empty to hide the button."
        >
          {(id) => (
            <input
              id={id}
              type="url"
              placeholder="https://"
              value={d.links[k] ?? ''}
              onChange={(e) => set('links', { ...d.links, [k]: e.target.value })}
            />
          )}
        </Field>
      ))}
      <Field label="GitHub repository" hint="owner/name, for stars and commits.">
        {(id) => (
          <input
            id={id}
            pattern="[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+"
            value={d.repo}
            onChange={(e) => set('repo', e.target.value)}
          />
        )}
      </Field>

      <fieldset className="plain">
        <legend>Screenshots</legend>
        {d.screenshots.map((s, i) => (
          <div key={i} className="shot-row">
            <input
              aria-label={`Screenshot ${i + 1} file`}
              placeholder="screens/name.png"
              value={s.src}
              onChange={(e) =>
                set(
                  'screenshots',
                  d.screenshots.map((x, j) => (j === i ? { ...x, src: e.target.value } : x)),
                )
              }
            />
            <input
              aria-label={`Screenshot ${i + 1} description`}
              placeholder="Describe the screen"
              value={s.alt}
              onChange={(e) =>
                set(
                  'screenshots',
                  d.screenshots.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)),
                )
              }
            />
            <select
              aria-label={`Screenshot ${i + 1} device`}
              value={s.device}
              onChange={(e) =>
                set(
                  'screenshots',
                  d.screenshots.map((x, j) =>
                    j === i ? { ...x, device: e.target.value as (typeof DEVICES)[number] } : x,
                  ),
                )
              }
            >
              {DEVICES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                set(
                  'screenshots',
                  d.screenshots.filter((_, j) => j !== i),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() =>
            set('screenshots', [...d.screenshots, { src: '', alt: '', device: 'iphone' }])
          }
        >
          Add a screenshot
        </button>
        <p className="hint">
          Uploading images arrives later; for now enter the file name under the site&apos;s screens
          folder.
        </p>
      </fieldset>

      {admin && (
        <label className="check admin-only">
          <input
            type="checkbox"
            checked={d.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
          <span>Featured project (gets the gold ring in the hall)</span>
        </label>
      )}
      <button type="submit" className="primary" disabled={busy}>
        Save details
      </button>
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
    </form>
  );
}

/** Your own role on a project, shown on your card and the case study team list. */
function RoleField({
  project,
  initial,
  onSave,
}: {
  project: string;
  initial: string;
  onSave: (role: string) => void;
}) {
  const [role, setRole] = useState(initial);
  return (
    <div className="field">
      <label htmlFor={`role-${project}`}>Your role on {project}</label>
      <input
        id={`role-${project}`}
        maxLength={60}
        value={role}
        onChange={(e) => setRole(e.target.value)}
        onBlur={() => role !== initial && onSave(role.trim())}
      />
      <span className="hint">Saved when you leave the box. Example: Backend lead.</span>
    </div>
  );
}
