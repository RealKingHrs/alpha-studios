import { useMemo, useState } from 'react';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';
import { ConfirmButton, Empty, ErrorState, Field, Loading } from '../ui';
import { must, useAsync } from '../useAsync';
import { useWorkspaceBase, type WorkspaceBase } from '../useWorkspaceBase';
import {
  dueLabel,
  isoDate,
  itemsByDay,
  monthGrid,
  monthTitle,
  shiftMonth,
  upcoming,
  type CalendarItem,
  type EventKind,
  type EventRow,
  type TaskRow,
} from '../workspace';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KINDS: Array<[EventKind, string]> = [
  ['meeting', 'Meeting'],
  ['deadline', 'Deadline'],
  ['launch', 'Launch'],
  ['other', 'Other'],
];

/** The shared calendar: events, plus task due dates. Crew-wide events are the admin's; project events are the project's. */
export function Calendar({ me }: { me: MemberRow }) {
  const base = useWorkspaceBase(me);
  if (base.loading) return <Loading title="Calendar" what="Loading the calendar." />;
  if (base.error || !base.data)
    return (
      <ErrorState
        title="Calendar"
        message={base.error ?? 'Could not load.'}
        onRetry={base.reload}
      />
    );
  return <Month me={me} base={base.data} />;
}

function Month({ me, base }: { me: MemberRow; base: WorkspaceBase }) {
  const admin = me.role === 'admin';
  const now = new Date();
  const today = isoDate(now);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(today);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const from = weeks[0][0].iso;
  const to = weeks[weeks.length - 1][6].iso;

  const data = useAsync(async () => {
    const db = supabase!;
    const [events, tasks] = await Promise.all([
      must<EventRow[]>(
        db
          .from('events')
          .select('id, project_id, title, details, kind, starts_on, ends_on, created_by')
          .lte('starts_on', to)
          .order('starts_on')
          .limit(500),
      ),
      must<TaskRow[]>(
        db
          .from('tasks')
          .select(
            'id, project_id, title, details, status, assignee_id, due_on, created_by, created_at, updated_at, done_at',
          )
          .neq('status', 'done')
          .gte('due_on', from)
          .lte('due_on', to),
      ),
    ]);
    return { events, tasks };
  }, `calendar:${from}:${to}`);

  const byDay = useMemo(
    () => itemsByDay(data.data?.events ?? [], data.data?.tasks ?? [], from, to),
    [data.data, from, to],
  );
  const soon = useMemo(
    () => upcoming(data.data?.events ?? [], data.data?.tasks ?? [], today, 8),
    [data.data, today],
  );
  const projectName = (id: string | null) =>
    id ? (base.projects.find((p) => p.id === id)?.name ?? 'Project') : 'Whole crew';

  if (data.loading) return <Loading title="Calendar" what="Loading the calendar." />;
  if (data.error) return <ErrorState title="Calendar" message={data.error} onRetry={data.reload} />;

  const chosen = byDay.get(selected) ?? [];
  const step = (by: number) => setCursor((c) => shiftMonth(c.year, c.month, by));

  return (
    <>
      <h1>Calendar</h1>
      <div className="cal-bar">
        <button
          type="button"
          className="secondary"
          onClick={() => step(-1)}
          aria-label="Previous month"
        >
          Back
        </button>
        <h2 className="cal-title" aria-live="polite">
          {monthTitle(cursor.year, cursor.month)}
        </h2>
        <button type="button" className="secondary" onClick={() => step(1)} aria-label="Next month">
          Next
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setCursor({ year: now.getFullYear(), month: now.getMonth() });
            setSelected(today);
          }}
        >
          Today
        </button>
      </div>
      <div className="cal" role="grid" aria-label={monthTitle(cursor.year, cursor.month)}>
        <div className="cal-row cal-head" role="row">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].iso} className="cal-row" role="row">
            {week.map((c) => {
              const items = byDay.get(c.iso) ?? [];
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  className={`cal-day${c.inMonth ? '' : ' is-out'}${c.iso === today ? ' is-today' : ''}${c.iso === selected ? ' is-selected' : ''}`}
                  aria-pressed={c.iso === selected}
                  aria-label={`${c.iso}, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                  onClick={() => setSelected(c.iso)}
                >
                  <span className="cal-num">{c.day}</span>
                  {items.slice(0, 3).map((i) => (
                    <span key={i.key} className={`chip-cal kind-${i.kind}`}>
                      {i.title}
                    </span>
                  ))}
                  {items.length > 3 && <span className="cal-more">+{items.length - 3} more</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="cal-cols">
        <section className="panel" aria-labelledby="cal-day-title">
          <h2 id="cal-day-title">{dueLabel(selected, today)}</h2>
          {chosen.length ? (
            <ul className="cal-list">
              {chosen.map((i) => (
                <DayItem
                  key={i.key}
                  item={i}
                  where={projectName(i.project_id)}
                  event={data.data!.events.find((e) => e.id === i.id)}
                  onChanged={data.reload}
                />
              ))}
            </ul>
          ) : (
            <Empty>Nothing on this day.</Empty>
          )}
          <AddEvent day={selected} admin={admin} projects={base.projects} onDone={data.reload} />
        </section>
        <section className="panel" aria-labelledby="cal-soon">
          <h2 id="cal-soon">Coming up</h2>
          {soon.length ? (
            <ul className="cal-list">
              {soon.map((i) => (
                <li key={i.key} className="cal-item">
                  <span className={`chip-cal kind-${i.kind}`}>{kindLabel(i)}</span>
                  <span className="grow">{i.title}</span>
                  <span className="hint">{dueLabel(i.iso, today)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing coming up in the next three months.</Empty>
          )}
        </section>
      </div>
    </>
  );
}

const kindLabel = (i: CalendarItem) =>
  i.type === 'task' ? 'Task due' : (KINDS.find(([k]) => k === i.kind)?.[1] ?? 'Event');

function DayItem({
  item,
  where,
  event,
  onChanged,
}: {
  item: CalendarItem;
  where: string;
  event: EventRow | undefined;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="cal-item">
      <span className={`chip-cal kind-${item.kind}`}>{kindLabel(item)}</span>
      <span className="grow">
        {item.title}
        <span className="hint"> · {where}</span>
        {event?.details && <span className="hint"> · {event.details}</span>}
      </span>
      {item.type === 'task' ? (
        <a className="link" href={`#/board/${item.project_id}`}>
          Open board
        </a>
      ) : (
        <ConfirmButton
          className="link"
          label="Remove"
          confirmLabel="Remove this event"
          onConfirm={() =>
            void supabase!
              .from('events')
              .delete()
              .eq('id', item.id)
              .select('id')
              .then(({ data, error: err }) => {
                if (err) setError(err.message);
                else if (!data?.length) setError('You cannot remove this event.');
                else onChanged();
              })
          }
        />
      )}
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </li>
  );
}

function AddEvent({
  day,
  admin,
  projects,
  onDone,
}: {
  day: string;
  admin: boolean;
  projects: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('meeting');
  const [project, setProject] = useState(projects[0]?.id ?? '');
  const [ends, setEnds] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = [...(admin ? [{ id: '', name: 'Whole crew' }] : []), ...projects];
  const chosen = options.some((o) => o.id === project) ? project : (options[0]?.id ?? '');

  if (!options.length) return <p className="hint">Join a project to add events.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase!.from('events').insert({
      project_id: chosen || null,
      title: title.trim(),
      kind,
      starts_on: day,
      ends_on: ends || null,
    });
    setError(err ? err.message : null);
    if (!err) {
      setTitle('');
      setEnds('');
      onDone();
    }
  }

  return (
    <form className="add-event" onSubmit={submit}>
      <h3>Add an event on {day}</h3>
      <Field label="Event title">
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
      <Field label="Kind">
        {(id) => (
          <select id={id} value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
            {KINDS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="For">
        {(id) => (
          <select id={id} value={chosen} onChange={(e) => setProject(e.target.value)}>
            {options.map((o) => (
              <option key={o.id || 'crew'} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Last day" hint="Leave empty for a single day.">
        {(id) => (
          <input
            id={id}
            type="date"
            min={day}
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
          />
        )}
      </Field>
      <button type="submit" className="primary" disabled={!title.trim()}>
        Add event
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
