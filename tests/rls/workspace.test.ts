import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, restoreAdmins, run, service, signedIn, stepAsideAdmins, visitor } from './helpers';

// Tasks, notes, events, the activity feed and search, with real sign-ins against the local stack.

let admin: SupabaseClient;
let ann: SupabaseClient; // crew, on the project
let ben: SupabaseClient; // crew, not on the project
let paused: SupabaseClient; // crew whose access is paused, and who is on the project
const id = {} as Record<'admin' | 'ann' | 'ben' | 'paused', string>;
let projectId: string;
let otherProjectId: string;
let steppedAside: string[] = [];
const cleanup = { members: [] as string[], users: [] as string[], projects: [] as string[] };

async function member(label: string, user: string, extra: Record<string, unknown> = {}) {
  const row = await must(
    service
      .from('members')
      .insert({
        slug: `w-${label}-${run}`,
        name: label,
        user_id: user,
        access_status: 'active',
        ...extra,
      })
      .select('id')
      .single(),
  );
  cleanup.members.push(row.id);
  return row.id as string;
}

async function project(name: string) {
  const row = await must(
    service
      .from('projects')
      .insert({ slug: `w-${name}-${run}`, name })
      .select('id')
      .single(),
  );
  cleanup.projects.push(row.id);
  return row.id as string;
}

const task = (client: SupabaseClient, project_id: string, title: string, extra = {}) =>
  client
    .from('tasks')
    .insert({ project_id, title, ...extra })
    .select('id')
    .single();

beforeAll(async () => {
  const users = await Promise.all(['wadmin', 'wann', 'wben', 'wpaused'].map((l) => signedIn(l)));
  [admin, ann, ben, paused] = users.map((u) => u.client);
  cleanup.users.push(...users.map((u) => u.userId));
  steppedAside = await stepAsideAdmins();
  id.admin = await member('admin', users[0].userId, { role: 'admin' });
  id.ann = await member('ann', users[1].userId);
  id.ben = await member('ben', users[2].userId);
  id.paused = await member('paused', users[3].userId, { access_status: 'revoked' });
  projectId = await project('alpha');
  otherProjectId = await project('beta');
  await must(
    service.from('project_members').insert([
      { project_id: projectId, member_id: id.ann },
      { project_id: projectId, member_id: id.paused },
      { project_id: otherProjectId, member_id: id.ben },
    ]),
  );
});

afterAll(async () => {
  await service.from('events').delete().is('project_id', null).like('title', `%${run}%`);
  await service.from('activity').delete().in('project_id', cleanup.projects);
  await service.from('projects').delete().in('id', cleanup.projects);
  await service.from('members').delete().in('id', cleanup.members);
  await restoreAdmins(steppedAside);
  for (const u of cleanup.users) await service.auth.admin.deleteUser(u);
});

describe('visitors', () => {
  it('see and change nothing', async () => {
    for (const t of ['tasks', 'project_notes', 'events', 'activity'])
      expect((await visitor.from(t).select('*')).error, t).not.toBeNull();
    expect((await visitor.rpc('search_workspace', { p_query: 'alpha' })).error).not.toBeNull();
  });
});

describe('tasks', () => {
  let taskId: string;

  it('lets a project member add a task, and records who did', async () => {
    const { data, error } = await task(ann, projectId, `Login screen ${run}`);
    expect(error).toBeNull();
    taskId = data!.id;
    const row = await must(
      ann.from('tasks').select('created_by, status, done_at').eq('id', taskId).single(),
    );
    expect(row.created_by).toBe(id.ann);
    expect(row.status).toBe('todo');
    expect(row.done_at).toBeNull();
  });

  it('shows it to the admin and the project, and to nobody else', async () => {
    expect(await must(admin.from('tasks').select('id').eq('id', taskId))).toHaveLength(1);
    expect(await must(ann.from('tasks').select('id').eq('id', taskId))).toHaveLength(1);
    expect(await must(ben.from('tasks').select('id').eq('id', taskId))).toHaveLength(0);
    expect(await must(paused.from('tasks').select('id').eq('id', taskId))).toHaveLength(0);
  });

  it('blocks an outsider, a paused member and forged authors', async () => {
    expect((await task(ben, projectId, 'sneaky')).error).not.toBeNull();
    expect((await task(paused, projectId, 'still here')).error).not.toBeNull();
    expect(
      (await ann.from('tasks').insert({ project_id: projectId, title: 'x', created_by: id.ben }))
        .error,
    ).not.toBeNull();
    const own = await must(task(ann, projectId, `Own ${run}`));
    const row = await must(ann.from('tasks').select('created_by').eq('id', own.id).single());
    expect(row.created_by).toBe(id.ann);
    expect(
      await must(ben.from('tasks').update({ title: 'hijack' }).eq('id', taskId).select('id')),
    ).toHaveLength(0);
    expect(await must(ben.from('tasks').delete().eq('id', taskId).select('id'))).toHaveLength(0);
  });

  it('only lets someone on the project be the assignee', async () => {
    expect(
      (await ann.from('tasks').update({ assignee_id: id.ben }).eq('id', taskId)).error,
    ).not.toBeNull();
    expect(
      (await ann.from('tasks').update({ assignee_id: id.ann }).eq('id', taskId)).error,
    ).toBeNull();
  });

  it('moves across the board, sets done_at, and never changes project', async () => {
    expect((await ann.from('tasks').update({ status: 'doing' }).eq('id', taskId)).error).toBeNull();
    expect((await ann.from('tasks').update({ status: 'done' }).eq('id', taskId)).error).toBeNull();
    const done = await must(ann.from('tasks').select('done_at').eq('id', taskId).single());
    expect(done.done_at).not.toBeNull();
    expect((await ann.from('tasks').update({ status: 'todo' }).eq('id', taskId)).error).toBeNull();
    const back = await must(ann.from('tasks').select('done_at').eq('id', taskId).single());
    expect(back.done_at).toBeNull();
    expect(
      (await ann.from('tasks').update({ project_id: otherProjectId }).eq('id', taskId)).error,
    ).not.toBeNull();
  });

  it('rejects an empty or over-long title', async () => {
    expect((await task(ann, projectId, '   ')).error).not.toBeNull();
    expect((await task(ann, projectId, 'x'.repeat(121))).error).not.toBeNull();
  });

  it('lets the admin work on any project', async () => {
    const { error } = await task(admin, otherProjectId, `Admin task ${run}`);
    expect(error).toBeNull();
  });
});

describe('notes', () => {
  let noteId: string;

  it('are written and read by project members and the admin only', async () => {
    const note = await must(
      ann
        .from('project_notes')
        .insert({ project_id: projectId, title: `Plan ${run}`, body: 'first draft' })
        .select('id')
        .single(),
    );
    noteId = note.id;
    expect(await must(admin.from('project_notes').select('id').eq('id', noteId))).toHaveLength(1);
    expect(await must(ben.from('project_notes').select('id').eq('id', noteId))).toHaveLength(0);
    expect(
      (await ben.from('project_notes').insert({ project_id: projectId, title: 'x', body: '' }))
        .error,
    ).not.toBeNull();
    expect(
      await must(ben.from('project_notes').update({ body: 'x' }).eq('id', noteId).select('id')),
    ).toHaveLength(0);
    expect(await must(paused.from('project_notes').select('id').eq('id', noteId))).toHaveLength(0);
  });

  it('record the last editor, and cannot be forged', async () => {
    expect(
      (await admin.from('project_notes').update({ body: 'edited by admin' }).eq('id', noteId))
        .error,
    ).toBeNull();
    const row = await must(
      ann.from('project_notes').select('updated_by, created_by, body').eq('id', noteId).single(),
    );
    expect(row.updated_by).toBe(id.admin);
    expect(row.created_by).toBe(id.ann);
    expect(
      (await ann.from('project_notes').update({ updated_by: id.ben }).eq('id', noteId)).error,
    ).not.toBeNull();
  });

  it('cannot hold more than 20,000 characters', async () => {
    expect(
      (
        await ann
          .from('project_notes')
          .insert({ project_id: projectId, title: 'big', body: 'x'.repeat(20001) })
      ).error,
    ).not.toBeNull();
  });
});

describe('events', () => {
  it('project events follow project membership', async () => {
    const row = await must(
      ann
        .from('events')
        .insert({
          project_id: projectId,
          title: `Review ${run}`,
          kind: 'meeting',
          starts_on: '2026-12-01',
        })
        .select('id')
        .single(),
    );
    expect(await must(admin.from('events').select('id').eq('id', row.id))).toHaveLength(1);
    expect(await must(ben.from('events').select('id').eq('id', row.id))).toHaveLength(0);
    expect(
      (
        await ben
          .from('events')
          .insert({ project_id: projectId, title: 'x', starts_on: '2026-12-02' })
      ).error,
    ).not.toBeNull();
  });

  it('crew-wide events are written by the admin and read by every active member', async () => {
    const row = await must(
      admin
        .from('events')
        .insert({ title: `Studio day ${run}`, kind: 'other', starts_on: '2026-12-10' })
        .select('id')
        .single(),
    );
    for (const c of [admin, ann, ben])
      expect(await must(c.from('events').select('id').eq('id', row.id))).toHaveLength(1);
    expect(await must(paused.from('events').select('id').eq('id', row.id))).toHaveLength(0);
    expect(
      (await ann.from('events').insert({ title: 'crew wide?', starts_on: '2026-12-11' })).error,
    ).not.toBeNull();
    expect(
      await must(ann.from('events').update({ title: 'x' }).eq('id', row.id).select('id')),
    ).toHaveLength(0);
    expect(await must(ann.from('events').delete().eq('id', row.id).select('id'))).toHaveLength(0);
  });

  it('rejects an end date before the start', async () => {
    expect(
      (
        await admin
          .from('events')
          .insert({ title: 'backwards', starts_on: '2026-12-10', ends_on: '2026-12-09' })
      ).error,
    ).not.toBeNull();
  });
});

describe('the activity feed', () => {
  it('is written by triggers, readable by the project, and never by outsiders', async () => {
    const feed = await must(
      ann
        .from('activity')
        .select('kind, summary, actor_id')
        .eq('project_id', projectId)
        .order('id'),
    );
    const kinds = feed.map((f: { kind: string }) => f.kind);
    expect(kinds).toContain('task_added');
    expect(kinds).toContain('task_moved');
    expect(kinds).toContain('task_assigned');
    expect(kinds).toContain('note_added');
    expect(kinds).toContain('event_added');
    expect(feed.find((f: { kind: string }) => f.kind === 'task_moved')?.summary).toMatch(
      /^moved ".+" to /,
    );
    expect(await must(ben.from('activity').select('id').eq('project_id', projectId))).toHaveLength(
      0,
    );
    expect(
      await must(paused.from('activity').select('id').eq('project_id', projectId)),
    ).toHaveLength(0);
    expect(
      await must(admin.from('activity').select('id').eq('project_id', projectId)),
    ).not.toHaveLength(0);
  });

  it('merges repeated edits to one note by one person into one line', async () => {
    const note = await must(
      ann
        .from('project_notes')
        .insert({ project_id: projectId, title: `Merge ${run}`, body: 'a' })
        .select('id')
        .single(),
    );
    for (const body of ['b', 'c', 'd'])
      await ann.from('project_notes').update({ body }).eq('id', note.id);
    const lines = await must(
      service.from('activity').select('id').eq('ref_id', note.id).eq('kind', 'note_edited'),
    );
    expect(lines).toHaveLength(1);
  });

  it('cannot be written, changed or removed by anyone signed in', async () => {
    for (const c of [ann, admin]) {
      expect(
        (await c.from('activity').insert({ project_id: projectId, kind: 'x', summary: 'forged' }))
          .error,
      ).not.toBeNull();
      expect(
        (await c.from('activity').update({ summary: 'edited' }).eq('project_id', projectId)).error,
      ).not.toBeNull();
      expect((await c.from('activity').delete().eq('project_id', projectId)).error).not.toBeNull();
    }
  });

  it('never carries message text', async () => {
    const room = await must(service.from('conversations').select('id').eq('kind', 'crew').single());
    const secret = `confidential-${run}`;
    await must(
      service
        .from('messages')
        .insert({ conversation_id: room.id, author_id: id.ann, body: secret })
        .select('id'),
    );
    const all = await must(service.from('activity').select('summary'));
    expect(all.some((a: { summary: string }) => a.summary.includes(secret))).toBe(false);
    await service.from('messages').delete().eq('body', secret);
  });
});

describe('search', () => {
  it('finds tasks, notes and messages only for people who may read them', async () => {
    const word = `zebracorn${run}`;
    await must(task(ann, projectId, `Fix ${word}`));
    await must(
      ann
        .from('project_notes')
        .insert({ project_id: projectId, title: 'Notes', body: `about ${word}` })
        .select('id')
        .single(),
    );
    const room = await must(service.from('conversations').select('id').eq('kind', 'crew').single());
    await must(
      service
        .from('messages')
        .insert({ conversation_id: room.id, author_id: id.ann, body: `${word} in chat` })
        .select('id'),
    );
    const kinds = (rows: Array<{ kind: string }>) => rows.map((r) => r.kind).sort();
    expect(kinds(await must(ann.rpc('search_workspace', { p_query: word })))).toEqual([
      'message',
      'note',
      'task',
    ]);
    expect(kinds(await must(admin.rpc('search_workspace', { p_query: word })))).toEqual([
      'message',
      'note',
      'task',
    ]);
    expect(kinds(await must(ben.rpc('search_workspace', { p_query: word })))).toEqual(['message']);
    expect(await must(paused.rpc('search_workspace', { p_query: word }))).toHaveLength(0);
    expect(await must(ann.rpc('search_workspace', { p_query: '   ' }))).toHaveLength(0);
    await service.from('messages').delete().like('body', `${word}%`);
  });
});

describe('deleting a project', () => {
  it('removes its tasks, notes, events and activity', async () => {
    const gone = await project('gone');
    await must(service.from('project_members').insert({ project_id: gone, member_id: id.ann }));
    await must(task(ann, gone, 'temp'));
    await must(
      ann
        .from('project_notes')
        .insert({ project_id: gone, title: 'temp', body: '' })
        .select('id')
        .single(),
    );
    await must(service.from('projects').delete().eq('id', gone));
    for (const t of ['tasks', 'project_notes', 'events', 'activity'])
      expect(await must(service.from(t).select('id').eq('project_id', gone))).toHaveLength(0);
  });
});
