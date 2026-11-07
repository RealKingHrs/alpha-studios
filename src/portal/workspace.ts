// Pure helpers for the workspace screens (board, notes, calendar, activity, search), kept apart from React so
// they can be tested. Dates are plain "YYYY-MM-DD" strings in the reader's own calendar; nothing here uses UTC.
import { dayLabel } from './messaging';

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  details: string;
  status: TaskStatus;
  assignee_id: string | null;
  due_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  done_at: string | null;
}

export interface NoteRow {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EventKind = 'deadline' | 'launch' | 'meeting' | 'other';

export interface EventRow {
  id: string;
  project_id: string | null;
  title: string;
  details: string;
  kind: EventKind;
  starts_on: string;
  ends_on: string | null;
  created_by: string | null;
}

export interface ActivityRow {
  id: number;
  at: string;
  project_id: string | null;
  actor_id: string | null;
  kind: string;
  summary: string;
  ref_id: string | null;
}

export interface SearchHit {
  kind: 'message' | 'task' | 'note';
  id: string;
  project_id: string | null;
  conversation_id: string | null;
  title: string;
  snippet: string;
  at: string;
}

// ---------------------------------------------------------------- the board
export const COLUMNS: Array<[TaskStatus, string]> = [
  ['todo', 'To do'],
  ['doing', 'Doing'],
  ['done', 'Done'],
];

/** The moves offered on a card. Buttons rather than dragging, so the board works by keyboard and on a phone. */
export const MOVES: Record<TaskStatus, Array<{ to: TaskStatus; label: string }>> = {
  todo: [{ to: 'doing', label: 'Start' }],
  doing: [
    { to: 'done', label: 'Done' },
    { to: 'todo', label: 'Back to to do' },
  ],
  done: [{ to: 'todo', label: 'Reopen' }],
};

/** Splits tasks into the three columns. Earliest due date first, tasks without one last, then oldest first. */
export function groupTasks(tasks: TaskRow[]): Record<TaskStatus, TaskRow[]> {
  const out: Record<TaskStatus, TaskRow[]> = { todo: [], doing: [], done: [] };
  for (const t of tasks) out[t.status].push(t);
  const byDue = (a: TaskRow, b: TaskRow) =>
    (a.due_on ?? '9999-12-31').localeCompare(b.due_on ?? '9999-12-31') ||
    a.created_at.localeCompare(b.created_at);
  out.todo.sort(byDue);
  out.doing.sort(byDue);
  out.done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
  return out;
}

// ---------------------------------------------------------------- dates
const pad = (n: number) => String(n).padStart(2, '0');

/** A date as "YYYY-MM-DD" in the reader's own calendar. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses "YYYY-MM-DD" as a local date at noon, so daylight saving never moves it to another day. */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** A task is overdue when its due date has passed and it is not done. Due today is not overdue. */
export const isOverdue = (due: string | null, status: TaskStatus, today: string) =>
  Boolean(due) && status !== 'done' && due! < today;

export function dueLabel(due: string, today: string): string {
  if (due === today) return 'Today';
  if (due === addDays(today, 1)) return 'Tomorrow';
  if (due === addDays(today, -1)) return 'Yesterday';
  return parseIso(due).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const monthTitle = (year: number, month: number) =>
  new Date(year, month, 1, 12).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Moves a month by `by` months, rolling the year. */
export function shiftMonth(year: number, month: number, by: number) {
  const d = new Date(year, month + by, 1, 12);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export interface Cell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** The weeks that cover a month, Monday first, padded with days from the months either side. */
export function monthGrid(year: number, month: number): Cell[][] {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0, 12).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const weeks: Cell[][] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - lead + i, 12);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      iso: isoDate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return weeks;
}

// ---------------------------------------------------------------- the calendar
export interface CalendarItem {
  key: string;
  iso: string;
  title: string;
  /** An event, or a task's due date (shown for reference and not editable here). */
  type: 'event' | 'task';
  kind: EventKind | 'task';
  project_id: string | null;
  id: string;
}

/**
 * Everything on the calendar by day, for the days from `from` to `to` inclusive. Multi-day events appear on each day.
 * Tasks appear on their due date until they are done.
 */
export function itemsByDay(
  events: EventRow[],
  tasks: TaskRow[],
  from: string,
  to: string,
): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const add = (item: CalendarItem) => {
    if (item.iso < from || item.iso > to) return;
    map.set(item.iso, [...(map.get(item.iso) ?? []), item]);
  };
  for (const e of events) {
    const end = e.ends_on && e.ends_on >= e.starts_on ? e.ends_on : e.starts_on;
    // Never expand more than a year, so a mistyped end date cannot freeze the page.
    for (let d = e.starts_on, n = 0; d <= end && n < 366; d = addDays(d, 1), n++)
      add({
        key: `${e.id}:${d}`,
        iso: d,
        title: e.title,
        type: 'event',
        kind: e.kind,
        project_id: e.project_id,
        id: e.id,
      });
  }
  for (const t of tasks)
    if (t.due_on && t.status !== 'done')
      add({
        key: `task:${t.id}`,
        iso: t.due_on,
        title: t.title,
        type: 'task',
        kind: 'task',
        project_id: t.project_id,
        id: t.id,
      });
  for (const list of map.values())
    list.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  return map;
}

/** The next few things from today on, soonest first. */
export function upcoming(
  events: EventRow[],
  tasks: TaskRow[],
  today: string,
  limit = 6,
): CalendarItem[] {
  const horizon = addDays(today, 90);
  const map = itemsByDay(events, tasks, today, horizon);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) => items)
    .slice(0, limit);
}

// ---------------------------------------------------------------- the feed
/** Groups feed lines by day, newest day first, keeping each day's lines newest first. */
export function groupByDay<T extends { at: string }>(
  rows: T[],
  now = new Date(),
): Array<[string, T[]]> {
  const out: Array<[string, T[]]> = [];
  for (const r of [...rows].sort((a, b) => b.at.localeCompare(a.at))) {
    const label = dayLabel(r.at, now);
    const last = out[out.length - 1];
    if (last && last[0] === label) last[1].push(r);
    else out.push([label, [r]]);
  }
  return out;
}

/** "Riya added the task ..." */
export const activityLine = (actor: string | undefined, summary: string) =>
  `${actor ?? 'Someone'} ${summary}`;

// ---------------------------------------------------------------- search
export const SEARCH_LABEL: Record<SearchHit['kind'], string> = {
  message: 'Messages',
  task: 'Tasks',
  note: 'Notes',
};

/** Results in groups: tasks, then notes, then messages. */
export function groupHits(hits: SearchHit[]): Array<[string, SearchHit[]]> {
  return (['task', 'note', 'message'] as const)
    .map((k) => [SEARCH_LABEL[k], hits.filter((h) => h.kind === k)] as [string, SearchHit[]])
    .filter(([, rows]) => rows.length > 0);
}
