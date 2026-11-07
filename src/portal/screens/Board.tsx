import { useEffect, useState } from 'react';
import { Face } from '../Face';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { useWorkspaceBase, type WorkspaceBase } from '../useWorkspaceBase';
import {
  COLUMNS,
  MOVES,
  dueLabel,
  groupTasks,
  isOverdue,
  isoDate,
  type TaskRow,
  type TaskStatus,
} from '../workspace';

/** The task board for one project: To do, Doing and Done. Row-level security allows only the project and the admin. */
export function Board({ me, open }: { me: MemberRow; open: string }) {
  const base = useWorkspaceBase(me);
  if (base.loading) return <Loading title="Board" what="Loading your projects." />;
  if (base.error || !base.data)
    return (
      <ErrorState title="Board" message={base.error ?? 'Could not load.'} onRetry={base.reload} />
    );
  const { projects } = base.data;
  if (!projects.length)
    return (
      <>
        <h1>Board</h1>
        <Empty>
          You are not on a project yet. The admin assigns people to projects, and each project gets
          its own board.
        </Empty>
      </>
    );
  const project = projects.find((p) => p.id === open) ?? projects[0];
  return (
    <>
      <h1>Board</h1>
      <nav className="tabs" aria-label="Projects">
        {projects.map((p) => (
          <a
            key={p.id}
            href={`#/board/${p.id}`}
            aria-current={p.id === project.id ? 'page' : undefined}
          >
            {p.name}
          </a>
        ))}
      </nav>
      <ProjectBoard key={project.id} projectId={project.id} base={base.data} />
    </>
  );
}

function ProjectBoard({ projectId, base }: { projectId: string; base: WorkspaceBase }) {
  const db = supabase!;
  const tasks = useAsync(
    () =>
      must<TaskRow[]>(
        db
          .from('tasks')
          .select(
            'id, project_id, title, details, status, assignee_id, due_on, created_by, created_at, updated_at, done_at',
          )
          .eq('project_id', projectId),
      ),
    `tasks:${projectId}`,
  );
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const { reload } = tasks;

  // Live updates when the connection is up, and a gentle refresh when it is not.
  useEffect(() => {
    const channel = db
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => reload(),
      )
      .subscribe();
    const poll = setInterval(reload, 20_000);
    return () => {
      clearInterval(poll);
      void db.removeChannel(channel);
    };
  }, [db, projectId, reload]);

  const team = (base.team.get(projectId) ?? [])
    .map((id) => base.person.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await fn();
    setNote(error ? error.message : null);
    if (!error) reload();
  }
  const move = (id: string, status: TaskStatus) =>
    act(() => db.from('tasks').update({ status }).eq('id', id));

  if (tasks.loading) return <Loading what="Loading tasks." />;
  if (tasks.error) return <ErrorState message={tasks.error} onRetry={reload} />;
  const groups = groupTasks(tasks.data ?? []);
  const today = isoDate(new Date());

  return (
    <>
      <div className="team-line">
        <span className="hint">On this project:</span>
        <span className="team">
          {team.map((t) => (
            <span key={t.id} className="team-face" title={t.name}>
              <Face person={t} size={32} />
            </span>
          ))}
        </span>
      </div>
      <AddTask projectId={projectId} team={team} onDone={reload} />
      {note && (
        <p role="alert" className="error">
          {note}
        </p>
      )}
      <div className="board">
        {COLUMNS.map(([status, label]) => (
          <section key={status} className={`col col-${status}`} aria-labelledby={`col-${status}`}>
            <h2 id={`col-${status}`}>
              {label} <span className="col-count">{groups[status].length}</span>
            </h2>
            <ul className="col-list">
              {groups[status].map((t) => {
                const who = t.assignee_id ? base.person.get(t.assignee_id) : undefined;
                const late = isOverdue(t.due_on, t.status, today);
                return (
                  <li key={t.id} className="task">
                    <p className="task-title">{t.title}</p>
                    {t.details && editing !== t.id && <p className="task-details">{t.details}</p>}
                    <div className="task-meta">
                      {who && (
                        <span className="task-who" title={who.name}>
                          <Face person={who} size={26} />
                          <span>{who.name.split(' ')[0]}</span>
                        </span>
                      )}
                      {t.due_on && (
                        <span className={`due${late ? ' is-late' : ''}`}>
                          {late ? 'Overdue: ' : 'Due '}
                          {dueLabel(t.due_on, today)}
                        </span>
                      )}
                    </div>
                    {editing === t.id ? (
                      <EditTask
                        task={t}
                        team={team}
                        onClose={() => setEditing(null)}
                        onSaved={() => {
                          setEditing(null);
                          reload();
                        }}
                      />
                    ) : (
                      <div className="task-actions">
                        {MOVES[t.status].map((m) => (
                          <button
                            key={m.to}
                            type="button"
                            className={
                              m.to === 'done' || m.to === 'doing' ? 'primary' : 'secondary'
                            }
                            aria-label={`${m.label}: ${t.title}`}
                            onClick={() => void move(t.id, m.to)}
                          >
                            {m.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="link"
                          aria-label={`Edit ${t.title}`}
                          onClick={() => setEditing(t.id)}
                        >
                          Edit
                        </button>
                        <ConfirmButton
                          className="link"
                          label="Remove"
                          confirmLabel="Remove this task"
                          onConfirm={() => void act(() => db.from('tasks').delete().eq('id', t.id))}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
              {groups[status].length === 0 && <li className="col-empty">Nothing here.</li>}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

type Member = { id: string; name: string; avatar?: unknown };

function AddTask({
  projectId,
  team,
  onDone,
}: {
  projectId: string;
  team: Member[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [who, setWho] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase!.from('tasks').insert({
      project_id: projectId,
      title: title.trim(),
      assignee_id: who || null,
      due_on: due || null,
    });
    setError(err ? err.message : null);
    if (!err) {
      setTitle('');
      setWho('');
      setDue('');
      onDone();
    }
  }

  return (
    <form className="add-task" onSubmit={submit}>
      <Field label="New task">
        {(id) => (
          <input
            id={id}
            required
            maxLength={120}
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <Field label="Give it to">
        {(id) => (
          <select id={id} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Nobody yet</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Due">
        {(id) => <input id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>
      <button type="submit" className="primary" disabled={!title.trim()}>
        Add task
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}

function EditTask({
  task,
  team,
  onClose,
  onSaved,
}: {
  task: TaskRow;
  team: Member[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details);
  const [who, setWho] = useState(task.assignee_id ?? '');
  const [due, setDue] = useState(task.due_on ?? '');
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase!
      .from('tasks')
      .update({ title: title.trim(), details, assignee_id: who || null, due_on: due || null })
      .eq('id', task.id);
    if (err) setError(err.message);
    else onSaved();
  }

  return (
    <form className="edit-task" onSubmit={save}>
      <Field label="Task title">
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
      <Field label="Task details">
        {(id) => (
          <textarea
            id={id}
            rows={3}
            maxLength={2000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        )}
      </Field>
      <Field label="Given to">
        {(id) => (
          <select id={id} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Nobody</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="New due date">
        {(id) => <input id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>
      <div className="task-actions">
        <button type="submit" className="primary" disabled={!title.trim()}>
          Save
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
