import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, restoreAdmins, run, service, signedIn, stepAsideAdmins, visitor } from './helpers';

// Direct messages, project channels, the crew room and the admin's oversight switch,
// with real sign-ins against the local stack.

let admin: SupabaseClient;
let ann: SupabaseClient; // crew, on the project
let ben: SupabaseClient; // crew, not on the project
let cat: SupabaseClient; // crew, a stranger to the Ann and Ben thread
let paused: SupabaseClient; // crew whose access is paused
const id = {} as Record<'admin' | 'ann' | 'ben' | 'cat' | 'paused', string>;
let projectId: string;
let steppedAside: string[] = [];
const cleanup = { members: [] as string[], users: [] as string[] };

async function member(label: string, user: string, extra: Record<string, unknown> = {}) {
  const row = await must(
    service
      .from('members')
      .insert({
        slug: `m-${label}-${run}`,
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

const post = (client: SupabaseClient, conversation: string, body: string, author: string) =>
  client.from('messages').insert({ conversation_id: conversation, body, author_id: author });

const readable = async (client: SupabaseClient, conversation: string) =>
  must(client.from('messages').select('id, body').eq('conversation_id', conversation));

let dm: string; // Ann and Ben
let crewRoom: string;
let channel: string;

beforeAll(async () => {
  const users = await Promise.all(
    ['madmin', 'mann', 'mben', 'mcat', 'mpaused'].map((l) => signedIn(l)),
  );
  [admin, ann, ben, cat, paused] = users.map((u) => u.client);
  cleanup.users.push(...users.map((u) => u.userId));
  steppedAside = await stepAsideAdmins();
  id.admin = await member('admin', users[0].userId, { role: 'admin' });
  id.ann = await member('ann', users[1].userId);
  id.ben = await member('ben', users[2].userId);
  id.cat = await member('cat', users[3].userId);
  id.paused = await member('paused', users[4].userId, { access_status: 'revoked' });

  const project = await must(
    service
      .from('projects')
      .insert({ slug: `msg-${run}`, name: 'msg' })
      .select('id')
      .single(),
  );
  projectId = project.id;
  await must(service.from('project_members').insert({ project_id: projectId, member_id: id.ann }));

  const { data, error } = await ann.rpc('start_dm', { p_other: id.ben });
  if (error) throw new Error(error.message);
  dm = data as string;
  crewRoom = (await must(service.from('conversations').select('id').eq('kind', 'crew').single()))
    .id;
  channel = (
    await must(service.from('conversations').select('id').eq('project_id', projectId).single())
  ).id;
});

afterAll(async () => {
  await service.from('messages').delete().in('author_id', cleanup.members);
  await service.from('projects').delete().eq('id', projectId);
  if (dm) await service.from('conversations').delete().eq('id', dm);
  await service.from('oversight').delete().in('admin_member_id', cleanup.members);
  await service.from('members').delete().in('id', cleanup.members);
  await restoreAdmins(steppedAside);
  for (const u of cleanup.users) await service.auth.admin.deleteUser(u);
});

describe('visitors', () => {
  it('see no conversations, messages, status or oversight, and cannot post', async () => {
    for (const t of [
      'conversations',
      'messages',
      'conversation_members',
      'member_status',
      'oversight',
    ])
      expect((await visitor.from(t).select('*')).error, t).not.toBeNull();
    expect((await post(visitor, crewRoom, 'hi', id.ann)).error).not.toBeNull();
  });
});

describe('direct messages', () => {
  it('start_dm gives one thread per pair, whoever starts it', async () => {
    const again = await must(ben.rpc('start_dm', { p_other: id.ann }));
    expect(again).toBe(dm);
    const members = await must(
      service.from('conversation_members').select('member_id').eq('conversation_id', dm),
    );
    expect(members).toHaveLength(2);
  });

  it('cannot start a thread with yourself, a paused person or nobody', async () => {
    expect((await ann.rpc('start_dm', { p_other: id.ann })).error).not.toBeNull();
    expect((await ann.rpc('start_dm', { p_other: id.paused })).error).not.toBeNull();
    expect(
      (await ann.rpc('start_dm', { p_other: '00000000-0000-0000-0000-000000000000' })).error,
    ).not.toBeNull();
  });

  it('lets the two members talk and nobody else read', async () => {
    expect((await post(ann, dm, 'secret plan', id.ann)).error).toBeNull();
    expect((await post(ben, dm, 'got it', id.ben)).error).toBeNull();
    expect(await readable(ann, dm)).toHaveLength(2);
    expect(await readable(ben, dm)).toHaveLength(2);
    expect(await readable(cat, dm)).toHaveLength(0);
    expect(await readable(paused, dm)).toHaveLength(0);
    expect(
      await must(cat.from('conversation_members').select('*').eq('conversation_id', dm)),
    ).toHaveLength(0);
    expect(await must(cat.from('conversations').select('id').eq('id', dm))).toHaveLength(0);
  });

  it('keeps a stranger out of the thread, including writing and searching', async () => {
    expect((await post(cat, dm, 'let me in', id.cat)).error).not.toBeNull();
    const found = await must(cat.rpc('search_messages', { p_query: 'secret' }));
    expect(found).toHaveLength(0);
    const own = await must(ann.rpc('search_messages', { p_query: 'secret' }));
    expect(own).toHaveLength(1);
  });

  it('never lets someone post as another person', async () => {
    expect((await post(ann, dm, 'forged', id.ben)).error).not.toBeNull();
    expect((await post(ann, dm, 'forged', id.admin)).error).not.toBeNull();
  });
});

describe('admin oversight', () => {
  it('cannot read direct messages while oversight is off', async () => {
    expect(await readable(admin, dm)).toHaveLength(0);
    expect(await must(admin.rpc('search_messages', { p_query: 'secret' }))).toHaveLength(0);
  });

  it('only the admin can switch it, and the crew cannot see it', async () => {
    expect((await ann.rpc('set_oversight', { p_on: true })).error).not.toBeNull();
    expect(await readable(admin, dm)).toHaveLength(0);
    expect(await must(ann.from('oversight').select('*'))).toHaveLength(0);
    expect(
      await must(ann.from('audit_log').select('id').eq('table_name', 'oversight')),
    ).toHaveLength(0);
  });

  it('reads, but never writes, when it is on, and each switch is audited', async () => {
    expect((await admin.rpc('set_oversight', { p_on: true })).error).toBeNull();
    expect(await readable(admin, dm)).toHaveLength(2);
    expect(await must(admin.rpc('search_messages', { p_query: 'secret' }))).toHaveLength(1);
    expect((await post(admin, dm, 'listening', id.admin)).error).not.toBeNull();
    expect((await post(admin, dm, 'as ann', id.ann)).error).not.toBeNull();
    // Reading does not make the admin a member, so it adds nothing to their unread counts.
    const unread = await must(admin.rpc('unread_counts'));
    expect(
      unread.find((u: { conversation_id: string }) => u.conversation_id === dm),
    ).toBeUndefined();
    // A stranger still cannot read.
    expect(await readable(cat, dm)).toHaveLength(0);
    expect((await admin.rpc('set_oversight', { p_on: false })).error).toBeNull();
    expect(await readable(admin, dm)).toHaveLength(0);
    const log = await must(
      admin
        .from('audit_log')
        .select('action')
        .eq('table_name', 'oversight')
        .eq('row_id', id.admin)
        .order('id'),
    );
    expect(log.map((r: { action: string }) => r.action)).toEqual(['OVERSIGHT_ON', 'OVERSIGHT_OFF']);
  });
});

describe('project channels', () => {
  it('exist for every project and follow project membership', async () => {
    expect((await post(ann, channel, 'standup at 10', id.ann)).error).toBeNull();
    expect(await readable(ann, channel)).toHaveLength(1);
    expect(await readable(admin, channel)).toHaveLength(1);
    expect(await readable(ben, channel)).toHaveLength(0);
    expect((await post(ben, channel, 'can I join', id.ben)).error).not.toBeNull();
    expect((await post(admin, channel, 'welcome', id.admin)).error).toBeNull();

    await must(
      service.from('project_members').insert({ project_id: projectId, member_id: id.ben }),
    );
    expect(await readable(ben, channel)).toHaveLength(2);
    expect((await post(ben, channel, 'thanks', id.ben)).error).toBeNull();
    await service
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('member_id', id.ben);
    expect(await readable(ben, channel)).toHaveLength(0);
  });
});

describe('the crew room', () => {
  it('is open to every active member and closed to visitors and paused members', async () => {
    expect((await post(cat, crewRoom, 'hello all', id.cat)).error).toBeNull();
    for (const c of [admin, ann, ben, cat])
      expect((await readable(c, crewRoom)).length).toBeGreaterThan(0);
    expect(await readable(paused, crewRoom)).toHaveLength(0);
    expect((await post(paused, crewRoom, 'still here', id.paused)).error).not.toBeNull();
  });

  it('cannot be duplicated, and nobody can add rooms or members directly', async () => {
    expect((await service.from('conversations').insert({ kind: 'crew' })).error).not.toBeNull();
    expect((await ann.from('conversations').insert({ kind: 'crew' })).error).not.toBeNull();
    expect(
      (await ann.from('conversation_members').insert({ conversation_id: dm, member_id: id.cat }))
        .error,
    ).not.toBeNull();
  });
});

describe('messages', () => {
  it('rejects empty and over-long text', async () => {
    expect((await post(ann, crewRoom, '   ', id.ann)).error).not.toBeNull();
    expect((await post(ann, crewRoom, 'x'.repeat(4001), id.ann)).error).not.toBeNull();
    expect((await post(ann, crewRoom, 'x'.repeat(4000), id.ann)).error).toBeNull();
  });

  it('cannot be edited, and only the author can delete, which clears the text', async () => {
    const row = await must(
      ann
        .from('messages')
        .insert({ conversation_id: crewRoom, body: 'draft', author_id: id.ann })
        .select('id')
        .single(),
    );
    expect(
      (await ann.from('messages').update({ body: 'edited' }).eq('id', row.id)).error,
    ).not.toBeNull();
    expect((await ann.from('messages').delete().eq('id', row.id)).error).not.toBeNull();
    expect((await ben.rpc('delete_message', { p_id: row.id })).error).not.toBeNull();
    expect((await admin.rpc('delete_message', { p_id: row.id })).error).not.toBeNull();
    expect((await ann.rpc('delete_message', { p_id: row.id })).error).toBeNull();
    const after = await must(
      ann.from('messages').select('body, deleted_at').eq('id', row.id).single(),
    );
    expect(after.body).toBe('');
    expect(after.deleted_at).not.toBeNull();
  });

  it('limits sending to 30 a minute', async () => {
    const bulk = await signedIn('mbulk');
    cleanup.users.push(bulk.userId);
    const bulkId = await member('bulk', bulk.userId);
    const rows = Array.from({ length: 30 }, (_, i) => ({
      conversation_id: crewRoom,
      body: `n${i}`,
      author_id: bulkId,
    }));
    await must(service.from('messages').insert(rows).select('id'));
    const over = await post(bulk.client, crewRoom, 'one too many', bulkId);
    expect(over.error?.message).toMatch(/quickly/i);
  });
});

describe('read marks, unread counts, status and presence', () => {
  it("counts only other people's unread messages and clears on mark_read", async () => {
    const before = await must(ben.rpc('unread_counts'));
    const dmUnread = before.find((u: { conversation_id: string }) => u.conversation_id === dm);
    expect(Number(dmUnread.unread)).toBe(1); // Ann's 'secret plan'; Ben's own reply is not counted
    expect((await ben.rpc('mark_read', { p_conversation: dm })).error).toBeNull();
    const after = await must(ben.rpc('unread_counts'));
    expect(
      after.find((u: { conversation_id: string }) => u.conversation_id === dm),
    ).toBeUndefined();
    expect((await cat.rpc('mark_read', { p_conversation: dm })).error).not.toBeNull();
    expect(await must(ben.from('read_state').select('*'))).toHaveLength(1);
    expect(await must(cat.from('read_state').select('*').eq('conversation_id', dm))).toHaveLength(
      0,
    );
  });

  it('sets a status line up to 80 characters and shows presence to active members', async () => {
    expect((await ann.rpc('set_status', { p_text: 'heads down until 5' })).error).toBeNull();
    expect((await ann.rpc('set_status', { p_text: 'x'.repeat(81) })).error).not.toBeNull();
    expect((await paused.rpc('set_status', { p_text: 'hello' })).error).not.toBeNull();
    expect((await ben.rpc('heartbeat')).error).toBeNull();
    const seen = await must(cat.rpc('crew_presence'));
    const a = seen.find((r: { member_id: string }) => r.member_id === id.ann);
    expect(a.status_text).toBe('heads down until 5');
    expect(a.online).toBe(true);
    expect((await visitor.rpc('crew_presence')).error).not.toBeNull();
  });

  it("does not let anyone write another person's status or marks directly", async () => {
    expect(
      (await ann.from('member_status').update({ status_text: 'hacked' }).eq('member_id', id.ben))
        .error,
    ).not.toBeNull();
    expect(
      (await ann.from('read_state').insert({ member_id: id.ben, conversation_id: crewRoom })).error,
    ).not.toBeNull();
  });
});
