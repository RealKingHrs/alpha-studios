import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MESSAGE_MAX,
  STATUS_MAX,
  badge,
  buildList,
  canSend,
  clampStatus,
  dayLabel,
  dividerIndex,
  unreadTotal,
  upsertMessage,
  type MessageRow,
  type PersonRow,
} from '../src/portal/messaging';

const person = (id: string, name: string): PersonRow => ({
  id,
  name,
  role_title: '',
  access_status: 'active',
});
const people = [person('me', 'Me'), person('ann', 'Ann'), person('ben', 'Ben')];
const msg = (id: string, author: string | null, at: string, extra: Partial<MessageRow> = {}) =>
  ({
    id,
    conversation_id: 'c',
    author_id: author,
    body: id,
    created_at: at,
    deleted_at: null,
    ...extra,
  }) as MessageRow;

describe('the conversation list', () => {
  const conversations = [
    { id: 'd1', kind: 'dm' as const, project_id: null },
    { id: 'p1', kind: 'project' as const, project_id: 'pr1' },
    { id: 'crew', kind: 'crew' as const, project_id: null },
    { id: 'd2', kind: 'dm' as const, project_id: null },
  ];
  const dm = [
    { conversation_id: 'd1', member_id: 'me' },
    { conversation_id: 'd1', member_id: 'ann' },
    { conversation_id: 'd2', member_id: 'ann' },
    { conversation_id: 'd2', member_id: 'ben' },
  ];
  const list = buildList(
    'me',
    conversations,
    dm,
    people,
    [{ id: 'pr1', name: 'Launchpad' }],
    [{ conversation_id: 'd1', unread: '3' }],
  );

  it('puts the crew room first, then projects, then direct threads', () => {
    expect(list.map((c) => c.kind)).toEqual(['crew', 'project', 'dm', 'dm']);
    expect(list[0].title).toBe('Crew room');
    expect(list[1].title).toBe('Launchpad');
  });

  it('names a direct thread after the other person and counts unread', () => {
    const mine = list.find((c) => c.id === 'd1')!;
    expect(mine.title).toBe('Ann');
    expect(mine.otherId).toBe('ann');
    expect(mine.unread).toBe(3);
    expect(mine.overseen).toBe(false);
  });

  it("marks a thread between two other people as overseen, listed after the reader's own", () => {
    const other = list.find((c) => c.id === 'd2')!;
    expect(other.overseen).toBe(true);
    expect(other.title).toBe('Ann and Ben');
    expect(other.otherId).toBeNull();
    expect(list[list.length - 1].id).toBe('d2');
  });
});

describe('unread helpers', () => {
  it('adds counts that arrive as numbers or strings', () => {
    expect(
      unreadTotal([
        { conversation_id: 'a', unread: '2' },
        { conversation_id: 'b', unread: 5 },
      ]),
    ).toBe(7);
    expect(unreadTotal([])).toBe(0);
  });
  it('keeps the badge short', () => {
    expect(badge(7)).toBe('7');
    expect(badge(100)).toBe('99+');
  });
  it('finds the first unseen message from someone else', () => {
    const list = [
      msg('a', 'ann', '2026-11-05T10:00:00Z'),
      msg('b', 'me', '2026-11-05T10:05:00Z'),
      msg('c', 'ann', '2026-11-05T10:10:00Z'),
    ];
    expect(dividerIndex(list, 'me', '2026-11-05T10:02:00Z')).toBe(2);
    expect(dividerIndex(list, 'me', '2026-11-05T11:00:00Z')).toBe(-1);
    expect(dividerIndex(list, 'me', null)).toBe(-1);
    expect(
      dividerIndex(
        [msg('d', 'ann', '2026-11-05T10:10:00Z', { deleted_at: 'x' })],
        'me',
        '2026-11-05T10:00:00Z',
      ),
    ).toBe(-1);
  });
});

describe('messages in a thread', () => {
  it('keeps time order and never duplicates', () => {
    let list: MessageRow[] = [];
    list = upsertMessage(list, msg('b', 'ann', '2026-11-05T10:05:00Z'));
    list = upsertMessage(list, msg('a', 'ann', '2026-11-05T10:00:00Z'));
    list = upsertMessage(list, msg('b', 'ann', '2026-11-05T10:05:00Z'));
    expect(list.map((m) => m.id)).toEqual(['a', 'b']);
  });
  it('replaces a message when it is deleted', () => {
    let list = [msg('a', 'ann', '2026-11-05T10:00:00Z')];
    list = upsertMessage(
      list,
      msg('a', 'ann', '2026-11-05T10:00:00Z', { body: '', deleted_at: 'x' }),
    );
    expect(list).toHaveLength(1);
    expect(list[0].deleted_at).toBe('x');
  });
  it('allows sending only real text within the limit', () => {
    expect(canSend('  ')).toBe(false);
    expect(canSend('hi')).toBe(true);
    expect(canSend('x'.repeat(MESSAGE_MAX))).toBe(true);
    expect(canSend('x'.repeat(MESSAGE_MAX + 1))).toBe(false);
  });
  it('clamps the status line', () => {
    expect(clampStatus('  heads down  ')).toBe('heads down');
    expect(clampStatus('x'.repeat(200))).toHaveLength(STATUS_MAX);
  });
  it('labels days', () => {
    const now = new Date('2026-11-06T12:00:00');
    expect(dayLabel('2026-11-06T08:00:00', now)).toBe('Today');
    expect(dayLabel('2026-11-05T08:00:00', now)).toBe('Yesterday');
  });
});

// Workspace data is private. The publish job and the public site must never read it.
describe('privacy guard', () => {
  const TABLES = [
    'conversations',
    'conversation_members',
    'messages',
    'read_state',
    'member_status',
    'oversight',
  ];
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });

  it('keeps workspace tables out of the publish job and the snapshot code', () => {
    const code = [...files('scripts'), ...files('src/content'), ...files('src/site')]
      .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f))
      .filter((f) => !/dev-users|seed-sql/.test(f));
    for (const f of code) {
      const text = readFileSync(f, 'utf8');
      for (const t of TABLES)
        expect(
          new RegExp(`from\\(['"]${t}['"]\\)|public\\.${t}\\b`).test(text),
          `${f} must not read ${t}`,
        ).toBe(false);
    }
  });

  it('keeps the portal the only code that talks to the backend about messages', () => {
    for (const f of files('src/site').filter((x) => /\.tsx?$/.test(x)))
      expect(/supabase|rpc\(/.test(readFileSync(f, 'utf8')), f).toBe(false);
  });
});
