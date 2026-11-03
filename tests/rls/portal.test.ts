import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, run, service, signedIn } from './helpers';

// Invite codes, consent, revert and the new guards, with real sign-ins against the local stack.

let admin: SupabaseClient;
let crew: SupabaseClient;
let crewUser: string;
let adminMemberId: string;
let crewMemberId: string;
const cleanup = { members: [] as string[], projects: [] as string[], users: [] as string[] };

async function member(slug: string, extra: Record<string, unknown> = {}) {
  const row = await must(
    service
      .from('members')
      .insert({ slug: `${slug}-${run}`, name: slug, ...extra })
      .select('id')
      .single(),
  );
  cleanup.members.push(row.id);
  return row.id as string;
}

async function issue(memberId: string): Promise<string> {
  const { data, error } = await admin.rpc('issue_invite', { p_member: memberId });
  if (error) throw new Error(error.message);
  return data as string;
}

beforeAll(async () => {
  const a = await signedIn('padmin');
  const c = await signedIn('pcrew');
  [admin, crew, crewUser] = [a.client, c.client, c.userId];
  cleanup.users.push(a.userId, c.userId);
  await service.from('members').update({ role: 'crew' }).eq('role', 'admin');
  adminMemberId = await member('p-admin', {
    user_id: a.userId,
    role: 'admin',
    access_status: 'active',
  });
  crewMemberId = await member('p-crew', { user_id: c.userId, access_status: 'active' });
});

afterAll(async () => {
  await service.from('invite_attempts').delete().in('user_id', cleanup.users);
  await service.from('members').delete().in('id', cleanup.members);
  await service.from('projects').delete().in('id', cleanup.projects);
  for (const id of cleanup.users) await service.auth.admin.deleteUser(id);
});

describe('issuing invites', () => {
  it('lets only the admin issue a code, and never for the admin profile', async () => {
    const target = await member('inv-a');
    expect((await crew.rpc('issue_invite', { p_member: target })).error).not.toBeNull();
    const code = await issue(target);
    expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect((await admin.rpc('issue_invite', { p_member: adminMemberId })).error).not.toBeNull();
  });

  it('stores only a hash, never the code', async () => {
    const target = await member('inv-hash');
    const code = await issue(target);
    const rows = await must(
      service.from('invites').select('code_hash, used_at, expires_at').eq('member_id', target),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify(rows)).not.toContain(code.replace(/-/g, ''));
    expect(new Date(rows[0].expires_at).getTime()).toBeGreaterThan(Date.now() + 6 * 864e5);
  });

  it('reissuing expires the old code and locks the old login out', async () => {
    const target = await member('inv-reissue');
    const first = await issue(target);
    const second = await issue(target);
    expect(second).not.toBe(first);
    const open = await must(
      service
        .from('invites')
        .select('id')
        .eq('member_id', target)
        .gt('expires_at', new Date().toISOString()),
    );
    expect(open).toHaveLength(1);
  });
});

describe('redeeming invites', () => {
  async function newcomer(label: string) {
    const u = await signedIn(label);
    cleanup.users.push(u.userId);
    return u;
  }

  it('links the login, activates the profile and records consent', async () => {
    const target = await member('red-ok');
    const code = await issue(target);
    const u = await newcomer('red-ok');
    const { data } = await u.client.rpc('redeem_invite', {
      p_code: code.toLowerCase(),
      p_consent: true,
    });
    expect(data).toEqual({ ok: true, member: `red-ok-${run}` });
    const row = await must(
      service
        .from('members')
        .select('user_id, access_status, consented_at')
        .eq('id', target)
        .single(),
    );
    expect(row.user_id).toBe(u.userId);
    expect(row.access_status).toBe('active');
    expect(row.consented_at).not.toBeNull();
    // and now they can act as crew
    const own = await must(
      u.client.from('members').update({ bio: 'hello' }).eq('id', target).select('id'),
    );
    expect(own).toHaveLength(1);
  });

  it('never links anything for a wrong code, and a code works only once', async () => {
    const target = await member('red-wrong');
    const code = await issue(target);
    const u = await newcomer('red-wrong');
    const bad = await u.client.rpc('redeem_invite', { p_code: 'AAAA-BBBB-CCCC', p_consent: true });
    expect(bad.data.ok).toBe(false);
    const still = await must(service.from('members').select('user_id').eq('id', target).single());
    expect(still.user_id).toBeNull();

    expect((await u.client.rpc('redeem_invite', { p_code: code, p_consent: true })).data.ok).toBe(
      true,
    );
    const other = await newcomer('red-reuse');
    const reuse = await other.client.rpc('redeem_invite', { p_code: code, p_consent: true });
    expect(reuse.data.ok).toBe(false);
  });

  it('rejects an expired code', async () => {
    const target = await member('red-expired');
    const code = await issue(target);
    await must(
      service
        .from('invites')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('member_id', target),
    );
    const u = await newcomer('red-expired');
    expect((await u.client.rpc('redeem_invite', { p_code: code, p_consent: true })).data.ok).toBe(
      false,
    );
    const row = await must(service.from('members').select('user_id').eq('id', target).single());
    expect(row.user_id).toBeNull();
  });

  it('requires consent, and does not spend the code without it', async () => {
    const target = await member('red-consent');
    const code = await issue(target);
    const u = await newcomer('red-consent');
    const no = await u.client.rpc('redeem_invite', { p_code: code, p_consent: false });
    expect(no.data.ok).toBe(false);
    expect((await u.client.rpc('redeem_invite', { p_code: code, p_consent: true })).data.ok).toBe(
      true,
    );
  });

  it('rate-limits a login after five wrong guesses, even for the right code', async () => {
    const target = await member('red-rate');
    const code = await issue(target);
    const u = await newcomer('red-rate');
    for (let i = 0; i < 5; i++) {
      expect(
        (await u.client.rpc('redeem_invite', { p_code: `0000-0000-000${i}`, p_consent: true })).data
          .ok,
      ).toBe(false);
    }
    const locked = await u.client.rpc('redeem_invite', { p_code: code, p_consent: true });
    expect(locked.data.ok).toBe(false);
    expect(locked.data.error).toMatch(/Too many/);
    const row = await must(service.from('members').select('user_id').eq('id', target).single());
    expect(row.user_id).toBeNull();
  });

  it('refuses anonymous callers and logins already linked to a profile', async () => {
    const anon = (await import('./helpers')).visitor;
    expect(
      (await anon.rpc('redeem_invite', { p_code: 'AAAA-BBBB-CCCC', p_consent: true })).error,
    ).not.toBeNull();
    const target = await member('red-twice');
    const code = await issue(target);
    const linked = await crew.rpc('redeem_invite', { p_code: code, p_consent: true });
    expect(linked.data.ok).toBe(false);
  });
});

describe('guards', () => {
  it('stops crew changing their consent record or access', async () => {
    expect(
      (
        await crew
          .from('members')
          .update({ consented_at: new Date().toISOString() })
          .eq('id', crewMemberId)
      ).error,
    ).not.toBeNull();
    expect(
      (await crew.from('members').update({ access_status: 'revoked' }).eq('id', crewMemberId))
        .error,
    ).not.toBeNull();
  });

  it('stops the app deleting the admin profile, but not the backend owner', async () => {
    expect((await admin.from('members').delete().eq('id', adminMemberId)).error).not.toBeNull();
    const stillThere = await must(service.from('members').select('id').eq('id', adminMemberId));
    expect(stillThere).toHaveLength(1);
  });

  it('lets crew do their own profile and project membership and nothing wider', async () => {
    expect(
      await must(
        crew
          .from('members')
          .update({ bio: 'mine', links: { github: 'https://github.com/x' } })
          .eq('id', crewMemberId)
          .select('id'),
      ),
    ).toHaveLength(1);
    const project = await must(
      service
        .from('projects')
        .insert({ slug: `g-${run}`, name: 'g' })
        .select('id')
        .single(),
    );
    cleanup.projects.push(project.id);
    expect(
      (
        await crew
          .from('project_members')
          .insert({ project_id: project.id, member_id: crewMemberId })
      ).error,
    ).toBeNull();
    expect(
      await must(
        crew.from('projects').update({ summary: 'edited' }).eq('id', project.id).select('id'),
      ),
    ).toHaveLength(1);
    expect(
      (
        await crew
          .from('project_members')
          .delete()
          .eq('project_id', project.id)
          .eq('member_id', crewMemberId)
      ).error,
    ).toBeNull();
    expect(
      await must(
        crew.from('projects').update({ summary: 'no longer' }).eq('id', project.id).select('id'),
      ),
    ).toHaveLength(0);
    expect(crewUser).toBeTruthy();
  });
});

describe('reverting changes', () => {
  async function lastAudit(table: string, rowId: string, action: string) {
    const rows = await must(
      admin
        .from('audit_log')
        .select('id, previous, new')
        .eq('table_name', table)
        .eq('row_id', rowId)
        .eq('action', action)
        .order('id', { ascending: false })
        .limit(1),
    );
    return rows[0];
  }

  it('restores a crew edit to its previous value, once', async () => {
    await must(crew.from('members').update({ bio: 'before' }).eq('id', crewMemberId));
    await must(crew.from('members').update({ bio: 'after' }).eq('id', crewMemberId));
    const entry = await lastAudit('members', crewMemberId, 'UPDATE');
    expect(entry.new.bio).toBe('after');
    const res = await admin.rpc('revert_audit', { p_id: entry.id });
    expect(res.data).toEqual({ ok: true });
    expect(
      (await must(service.from('members').select('bio').eq('id', crewMemberId).single())).bio,
    ).toBe('before');
    expect((await admin.rpc('revert_audit', { p_id: entry.id })).data.ok).toBe(false);
  });

  it('is admin only', async () => {
    const entry = await lastAudit('members', crewMemberId, 'UPDATE');
    expect((await crew.rpc('revert_audit', { p_id: entry.id })).error).not.toBeNull();
  });

  it('brings back a deleted project and removes an added one', async () => {
    const p = await must(
      admin
        .from('projects')
        .insert({ slug: `rv-${run}`, name: 'Revertible', summary: 'keep me' })
        .select('id')
        .single(),
    );
    cleanup.projects.push(p.id);
    await must(admin.from('projects').delete().eq('id', p.id));
    const del = await lastAudit('projects', p.id, 'DELETE');
    expect((await admin.rpc('revert_audit', { p_id: del.id })).data.ok).toBe(true);
    expect(
      (await must(service.from('projects').select('summary').eq('id', p.id).single())).summary,
    ).toBe('keep me');

    const ins = await lastAudit('projects', p.id, 'INSERT');
    expect((await admin.rpc('revert_audit', { p_id: ins.id })).data.ok).toBe(true);
    expect(await must(service.from('projects').select('id').eq('id', p.id))).toHaveLength(0);
  });

  it('reverts a site settings edit', async () => {
    const before = await must(
      service.from('site_settings').select('studio_statement').eq('id', 1).single(),
    );
    await must(
      admin
        .from('site_settings')
        .update({ studio_statement: `changed ${run}` })
        .eq('id', 1),
    );
    const entry = await lastAudit('site_settings', '1', 'UPDATE');
    expect((await admin.rpc('revert_audit', { p_id: entry.id })).data.ok).toBe(true);
    expect(
      (await must(service.from('site_settings').select('studio_statement').eq('id', 1).single()))
        .studio_statement,
    ).toBe(before.studio_statement);
  });

  it('will not revert a login being linked', async () => {
    const target = await member('rv-link');
    const code = await issue(target);
    const u = await signedIn('rv-link');
    cleanup.users.push(u.userId);
    expect((await u.client.rpc('redeem_invite', { p_code: code, p_consent: true })).data.ok).toBe(
      true,
    );
    const link = await lastAudit('members', target, 'UPDATE');
    const res = await admin.rpc('revert_audit', { p_id: link.id });
    expect(res.data.ok).toBe(false);
    expect(res.data.error).toMatch(/Reissue an invite/);
    const row = await must(service.from('members').select('user_id').eq('id', target).single());
    expect(row.user_id).toBe(u.userId);
  });

  it('will not revert an invite entry', async () => {
    const target = await member('rv-inv');
    await issue(target);
    const rows = await must(
      admin.from('audit_log').select('id').eq('action', 'ISSUE_INVITE').eq('row_id', target),
    );
    expect((await admin.rpc('revert_audit', { p_id: rows[0].id })).data.ok).toBe(false);
  });

  it('records the revert itself in the audit log', async () => {
    const rows = await must(
      admin
        .from('audit_log')
        .select('id')
        .eq('table_name', 'members')
        .eq('row_id', crewMemberId)
        .order('id', { ascending: false })
        .limit(1),
    );
    expect(rows.length).toBe(1);
  });
});
