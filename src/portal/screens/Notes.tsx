import { useEffect, useState } from 'react';
import { Face } from '../Face';
import { dayLabel, timeLabel } from '../messaging';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { useWorkspaceBase, type WorkspaceBase } from '../useWorkspaceBase';
import type { NoteRow } from '../workspace';

/** Project notes: plain text, several per project, with who edited last. */
export function Notes({ me, project, note }: { me: MemberRow; project: string; note: string }) {
  const base = useWorkspaceBase(me);
  if (base.loading) return <Loading title="Notes" what="Loading your projects." />;
  if (base.error || !base.data)
    return (
      <ErrorState title="Notes" message={base.error ?? 'Could not load.'} onRetry={base.reload} />
    );
  const { projects } = base.data;
  if (!projects.length)
    return (
      <>
        <h1>Notes</h1>
        <Empty>
          You are not on a project yet. Each project has its own notes once you are on it.
        </Empty>
      </>
    );
  const current = projects.find((p) => p.id === project) ?? projects[0];
  return (
    <>
      <h1>Notes</h1>
      <nav className="tabs" aria-label="Projects">
        {projects.map((p) => (
          <a
            key={p.id}
            href={`#/notes/${p.id}`}
            aria-current={p.id === current.id ? 'page' : undefined}
          >
            {p.name}
          </a>
        ))}
      </nav>
      <ProjectNotes key={current.id} projectId={current.id} base={base.data} open={note} />
    </>
  );
}

function ProjectNotes({
  projectId,
  base,
  open,
}: {
  projectId: string;
  base: WorkspaceBase;
  open: string;
}) {
  const db = supabase!;
  const list = useAsync(
    () =>
      must<NoteRow[]>(
        db
          .from('project_notes')
          .select('id, project_id, title, body, created_by, updated_by, created_at, updated_at')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false }),
      ),
    `notes:${projectId}`,
  );
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const { data, error: err } = await db
      .from('project_notes')
      .insert({ project_id: projectId, title: 'Untitled note', body: '' })
      .select('id')
      .single();
    if (err) return setError(err.message);
    setError(null);
    list.reload();
    location.hash = `#/notes/${projectId}/${data.id}`;
  }

  if (list.loading) return <Loading what="Loading notes." />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  const notes = list.data ?? [];
  const current = notes.find((n) => n.id === open) ?? null;

  return (
    <div className="notes">
      <aside className="notes-list" aria-label="Notes">
        <button type="button" className="primary" onClick={() => void create()}>
          New note
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <a
                href={`#/notes/${projectId}/${n.id}`}
                aria-current={n.id === open ? 'page' : undefined}
              >
                <span className="msg-title">{n.title}</span>
                <span className="hint">
                  {dayLabel(n.updated_at)}, {timeLabel(n.updated_at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
        {notes.length === 0 && (
          <Empty>No notes yet. Start one for plans, decisions and links.</Empty>
        )}
      </aside>
      <section className="notes-main" aria-label="Note">
        {current ? (
          <Editor
            key={current.id}
            note={current}
            editor={current.updated_by ? base.person.get(current.updated_by) : undefined}
            onChanged={list.reload}
            onRemoved={() => {
              list.reload();
              location.hash = `#/notes/${projectId}`;
            }}
          />
        ) : (
          <div className="msg-none">
            <span className="msg-none-mark" aria-hidden="true">
              a<span>.</span>
            </span>
            <p>Pick a note, or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Editor({
  note,
  editor,
  onChanged,
  onRemoved,
}: {
  note: NoteRow;
  editor: { id: string; name: string; avatar?: unknown } | undefined;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const dirty = title !== note.title || body !== note.body;

  // Warn before closing the tab with unsaved words.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    if (!dirty || !title.trim()) return;
    setStatus('saving');
    const { error: err } = await supabase!
      .from('project_notes')
      .update({ title: title.trim(), body })
      .eq('id', note.id);
    if (err) {
      setError(err.message);
      setStatus('error');
    } else {
      setStatus('saved');
      onChanged();
    }
  }

  return (
    <form
      className="note-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Note title">
        {(id) => (
          <input
            id={id}
            required
            maxLength={120}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setStatus('idle');
            }}
            onBlur={() => void save()}
          />
        )}
      </Field>
      <Field label="Note text" hint={`${body.length} of 20,000 characters. Plain text.`}>
        {(id) => (
          <textarea
            id={id}
            rows={16}
            maxLength={20000}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setStatus('idle');
            }}
            onBlur={() => void save()}
          />
        )}
      </Field>
      <div className="note-foot">
        {editor && (
          <span className="task-who">
            <Face person={editor} size={26} />
            <span className="hint">
              Last edited by {editor.name}, {dayLabel(note.updated_at)} {timeLabel(note.updated_at)}
            </span>
          </span>
        )}
        <span className="grow" />
        <span role="status" className="hint">
          {status === 'saving' && 'Saving.'}
          {status === 'saved' && 'Saved.'}
          {status === 'idle' && dirty && 'You have unsaved changes.'}
          {status === 'error' && error}
        </span>
        <button type="submit" className="primary" disabled={!dirty || status === 'saving'}>
          Save note
        </button>
        <ConfirmButton
          label="Delete"
          confirmLabel="Delete this note"
          onConfirm={() =>
            void supabase!
              .from('project_notes')
              .delete()
              .eq('id', note.id)
              .then(({ error: err }) => (err ? setError(err.message) : onRemoved()))
          }
        />
      </div>
    </form>
  );
}
