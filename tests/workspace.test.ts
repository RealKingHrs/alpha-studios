import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  MOVES,
  activityLine,
  addDays,
  dueLabel,
  groupByDay,
  groupHits,
  groupTasks,
  isOverdue,
  isoDate,
  itemsByDay,
  monthGrid,
  shiftMonth,
  upcoming,
  type EventRow,
  type SearchHit,
  type TaskRow,
} from '../src/portal/workspace';

const task = (id: string, extra: Partial<TaskRow> = {}): TaskRow => ({
  id,
  project_id: 'p',
  title: id,
  details: '',
  status: 'todo',
  assignee_id: null,
  due_on: null,
  created_by: null,
  created_at: `2026-11-0${id.length}T10:00:00Z`,
  updated_at: '2026-11-01T10:00:00Z',
  done_at: null,
  ...extra,
});
const event = (id: string, starts_on: string, extra: Partial<EventRow> = {}): EventRow => ({
  id,
  project_id: null,
  title: id,
  details: '',
  kind: 'meeting',
  starts_on,
  ends_on: null,
  created_by: null,
  ...extra,
});

describe('the board', () => {
  it('has three columns and a move from every status', () => {
    expect(COLUMNS.map(([k]) => k)).toEqual(['todo', 'doing', 'done']);
    for (const [k] of COLUMNS) expect(MOVES[k].length).toBeGreaterThan(0);
    expect(MOVES.todo[0].to).toBe('doing');
    expect(MOVES.done[0].to).toBe('todo');
  });

  it('sorts by due date with undated tasks last, and puts the newest finished first', () => {
    const g = groupTasks([
      task('a', { due_on: '2026-12-05' }),
      task('b'),
      task('c', { due_on: '2026-12-01' }),
      task('d', { status: 'done', done_at: '2026-11-02T10:00:00Z' }),
      task('e', { status: 'done', done_at: '2026-11-03T10:00:00Z' }),
      task('f', { status: 'doing' }),
    ]);
    expect(g.todo.map((t) => t.id)).toEqual(['c', 'a', 'b']);
    expect(g.doing.map((t) => t.id)).toEqual(['f']);
    expect(g.done.map((t) => t.id)).toEqual(['e', 'd']);
  });

  it('calls a task overdue only when it is past due and not done', () => {
    expect(isOverdue('2026-11-05', 'todo', '2026-11-07')).toBe(true);
    expect(isOverdue('2026-11-07', 'todo', '2026-11-07')).toBe(false);
    expect(isOverdue('2026-11-05', 'done', '2026-11-07')).toBe(false);
    expect(isOverdue(null, 'todo', '2026-11-07')).toBe(false);
  });

  it('words a due date plainly', () => {
    expect(dueLabel('2026-11-07', '2026-11-07')).toBe('Today');
    expect(dueLabel('2026-11-08', '2026-11-07')).toBe('Tomorrow');
    expect(dueLabel('2026-11-06', '2026-11-07')).toBe('Yesterday');
    expect(dueLabel('2026-12-25', '2026-11-07')).toMatch(/25/);
  });
});

describe('dates', () => {
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formats a local date without drifting by a day', () => {
    expect(isoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(isoDate(new Date(2026, 11, 31, 23, 55))).toBe('2026-12-31');
  });

  it('shifts months and rolls the year', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('the month grid', () => {
  it('starts on Monday and fills whole weeks', () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].iso).toBe('2026-10-26');
    expect(weeks[0][6].iso).toBe('2026-11-01');
    expect(weeks[0][6].inMonth).toBe(true);
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });

  it('handles a month that starts on Monday with no lead days', () => {
    const weeks = monthGrid(2026, 5); // June 2026 starts on a Monday
    expect(weeks[0][0].iso).toBe('2026-06-01');
    expect(weeks[0][0].inMonth).toBe(true);
  });

  it('handles a leap February and a four-week month', () => {
    expect(
      monthGrid(2028, 1)
        .flat()
        .filter((c) => c.inMonth),
    ).toHaveLength(29);
    const feb = monthGrid(2027, 1); // Feb 2027 starts on a Monday and has 28 days
    expect(feb).toHaveLength(4);
  });
});

describe('the calendar', () => {
  it('places events and due tasks on their days, and leaves done tasks off', () => {
    const map = itemsByDay(
      [event('standup', '2026-11-10')],
      [task('a', { due_on: '2026-11-10' }), task('b', { due_on: '2026-11-11', status: 'done' })],
      '2026-11-01',
      '2026-11-30',
    );
    expect(map.get('2026-11-10')?.map((i) => i.type)).toEqual(['event', 'task']);
    expect(map.get('2026-11-11')).toBeUndefined();
  });

  it('shows a multi-day event on each day and clips to the range', () => {
    const map = itemsByDay(
      [event('retreat', '2026-11-28', { ends_on: '2026-12-02' })],
      [],
      '2026-11-30',
      '2026-12-31',
    );
    expect([...map.keys()]).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
  });

  it('survives a mistyped far-away end date', () => {
    const map = itemsByDay(
      [event('x', '2026-11-01', { ends_on: '2999-01-01' })],
      [],
      '2026-11-01',
      '2027-12-31',
    );
    expect([...map.values()].flat().length).toBeLessThanOrEqual(366);
  });

  it('lists what is coming up, soonest first', () => {
    const next = upcoming(
      [event('late', '2026-12-20'), event('soon', '2026-11-09'), event('past', '2026-11-01')],
      [task('due', { due_on: '2026-11-08' })],
      '2026-11-07',
    );
    expect(next.map((i) => i.title)).toEqual(['due', 'soon', 'late']);
    expect(
      upcoming([event('a', '2026-11-08'), event('b', '2026-11-09')], [], '2026-11-07', 1),
    ).toHaveLength(1);
  });
});

describe('the feed and search', () => {
  it('groups lines by day, newest first', () => {
    const now = new Date('2026-11-07T12:00:00');
    const groups = groupByDay(
      [
        { at: '2026-11-06T09:00:00', n: 1 },
        { at: '2026-11-07T09:00:00', n: 2 },
        { at: '2026-11-07T11:00:00', n: 3 },
      ],
      now,
    );
    expect(groups.map(([label]) => label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0][1].map((r) => r.n)).toEqual([3, 2]);
  });

  it('writes a feed line with the person first', () => {
    expect(activityLine('Riya', 'added the task "Login"')).toBe('Riya added the task "Login"');
    expect(activityLine(undefined, 'removed a task')).toBe('Someone removed a task');
  });

  it('groups search results as tasks, notes, then messages and drops empty groups', () => {
    const hit = (kind: SearchHit['kind']): SearchHit => ({
      kind,
      id: kind,
      project_id: null,
      conversation_id: null,
      title: '',
      snippet: '',
      at: '2026-11-07T10:00:00Z',
    });
    expect(groupHits([hit('message'), hit('task')]).map(([l]) => l)).toEqual(['Tasks', 'Messages']);
    expect(groupHits([])).toEqual([]);
  });
});
