import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, run, service, signedIn, visitor, restoreAdmins, stepAsideAdmins } from './helpers';

// Proves the permissions table in docs/SPEC.md section 7 for visitor, crew and admin,
// using real sign-ins against the local stack. Run: supabase start, then npm run test:rls.

let crew: SupabaseClient;
let other: SupabaseClient;
let admin: SupabaseClient;
let crewMemberId: string;
let otherMemberId: string;
let adminMemberId: string;
let ownProject: string; // crew is a member
let foreignProject: string; // crew is not a member
let steppedAside: string[] = [];
const created = { members: [] as string[], projects: [] as string[], users: [] as string[] };

async function newMember(slug: string, userId: string | null, role: 'crew' | 'admin' = 'crew') {
  const row = await must(
    service
      .from('members')
      .insert({
        slug: `${slug}-${run}`,
        name: slug,
        user_id: userId,
        role,
        access_status: 'active',
      })
      .select('id')
      .single(),
  );
  created.members.push(row.id);
  return row.id as string;
}

async function newProject(slug: string) {
  const row = await must(
    service
      .from('projects')
      .insert({ slug: `${slug}-${run}`, name: slug })
      .select('id')
      .single(),
  );
  created.projects.push(row.id);
  return row.id as string;
}

beforeAll(async () => {
  const a = await signedIn('admin');
  const c = await signedIn('crew');
  const o = await signedIn('other');
  [admin, crew, other] = [a.client, c.client, o.client];
  created.users.push(a.userId, c.userId, o.userId);

  // The single admin exists already on a real project; locally, make way for the test admin.
  steppedAside = await stepAsideAdmins();
  adminMemberId = await newMember('test-admin', a.userId, 'admin');
  crewMemberId = await newMember('test-crew', c.userId);
  otherMemberId = await newMember('test-other', o.userId);
  ownProject = await newProject('own-project');
  foreignProject = await newProject('foreign-project');
  await must(
    service.from('project_members').insert({ project_id: ownProject, member_id: crewMemberId }),
  );
});

afterAll(async () => {
  await service.from('members').delete().in('id', created.members);
  await restoreAdmins(steppedAside);
  await service.from('projects').delete().in('id', created.projects);
  for (const id of created.users) await service.auth.admin.deleteUser(id);
});

describe('visitor (not signed in)', () => {
  it('can read members, projects, membership, settings and repo cache', async () => {
    for (const t of ['members', 'projects', 'project_members', 'site_settings', 'repo_cache']) {
      const { error } = await visitor.from(t).select('*', { head: true, count: 'exact' }).limit(1);
      // members is restricted by column, so only check the public columns there
      if (t === 'members') continue;
      expect(error, t).toBeNull();
    }
    const { data, error } = await visitor.from('members').select('slug, name, bio, links, avatar');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(5);
  });

  it('cannot see login links or access status', async () => {
    expect((await visitor.from('members').select('user_id')).error).not.toBeNull();
    expect((await visitor.from('members').select('access_status')).error).not.toBeNull();
    expect((await visitor.from('members').select('role')).error).not.toBeNull();
  });

  it('cannot write anything', async () => {
    expect((await visitor.from('members').insert({ slug: 'x', name: 'x' })).error).not.toBeNull();
    expect(
      (await visitor.from('members').update({ bio: 'x' }).eq('id', crewMemberId)).error,
    ).not.toBeNull();
    expect((await visitor.from('projects').insert({ slug: 'x', name: 'x' })).error).not.toBeNull();
    expect(
      (await visitor.from('projects').update({ summary: 'x' }).eq('id', ownProject)).error,
    ).not.toBeNull();
    expect(
      (
        await visitor
          .from('project_members')
          .insert({ project_id: ownProject, member_id: otherMemberId })
      ).error,
    ).not.toBeNull();
    expect(
      (await visitor.from('site_settings').update({ studio_statement: 'x' }).eq('id', 1)).error,
    ).not.toBeNull();
  });

  it('cannot touch invites or the audit log', async () => {
    expect((await visitor.from('invites').select('*')).error).not.toBeNull();
    expect((await visitor.from('audit_log').select('*')).error).not.toBeNull();
    expect(
      (await visitor.from('audit_log').insert({ table_name: 'x', action: 'x' })).error,
    ).not.toBeNull();
  });
});

describe('crew', () => {
  it('can edit their own profile', async () => {
    const rows = await must(
      crew.from('members').update({ bio: 'edited by crew' }).eq('id', crewMemberId).select('bio'),
    );
    expect(rows).toEqual([{ bio: 'edited by crew' }]);
  });

  it("cannot edit another member's profile", async () => {
    const rows = await must(
      crew.from('members').update({ bio: 'hijack' }).eq('id', otherMemberId).select('id'),
    );
    expect(rows).toHaveLength(0);
  });

  it('cannot change their own role, access status, slug or login link', async () => {
    for (const patch of [
      { role: 'admin' },
      { access_status: 'revoked' },
      { slug: `renamed-${run}` },
      { user_id: null },
    ]) {
      const { error } = await crew.from('members').update(patch).eq('id', crewMemberId);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
  });

  it("can edit a project they belong to but not one they don't", async () => {
    const own = await must(
      crew.from('projects').update({ summary: 'crew edit' }).eq('id', ownProject).select('summary'),
    );
    expect(own).toEqual([{ summary: 'crew edit' }]);
    const foreign = await must(
      crew.from('projects').update({ summary: 'nope' }).eq('id', foreignProject).select('id'),
    );
    expect(foreign).toHaveLength(0);
  });

  it("cannot change a project's address or featured flag", async () => {
    expect(
      (await crew.from('projects').update({ featured: true }).eq('id', ownProject)).error,
    ).not.toBeNull();
    expect(
      (
        await crew
          .from('projects')
          .update({ slug: `x-${run}` })
          .eq('id', ownProject)
      ).error,
    ).not.toBeNull();
  });

  it('cannot join or leave projects: only the admin assigns people', async () => {
    expect(
      (
        await crew
          .from('project_members')
          .insert({ project_id: foreignProject, member_id: crewMemberId })
      ).error,
    ).not.toBeNull();
    const left = await must(
      crew
        .from('project_members')
        .delete()
        .eq('project_id', ownProject)
        .eq('member_id', crewMemberId)
        .select(),
    );
    expect(left).toHaveLength(0);
    const removeOther = await must(
      crew
        .from('project_members')
        .delete()
        .eq('project_id', foreignProject)
        .eq('member_id', otherMemberId)
        .select(),
    );
    expect(removeOther).toHaveLength(0);
  });

  it('cannot add or delete projects, or delete members', async () => {
    expect(
      (await crew.from('projects').insert({ slug: `c-${run}`, name: 'c' })).error,
    ).not.toBeNull();
    expect(
      await must(crew.from('projects').delete().eq('id', ownProject).select('id')),
    ).toHaveLength(0);
    expect(
      await must(crew.from('members').delete().eq('id', otherMemberId).select('id')),
    ).toHaveLength(0);
  });

  it('cannot read invites, change site settings, or touch the audit log', async () => {
    expect((await crew.from('invites').select('*')).data ?? []).toHaveLength(0);
    expect(
      await must(
        crew.from('site_settings').update({ studio_statement: 'x' }).eq('id', 1).select('id'),
      ),
    ).toHaveLength(0);
    expect(await must(crew.from('audit_log').select('*'))).toHaveLength(0);
    expect(
      (await crew.from('audit_log').insert({ table_name: 'x', action: 'x' })).error,
    ).not.toBeNull();
    expect((await crew.from('repo_cache').insert({ repo: 'a/b', data: {} })).error).not.toBeNull();
  });

  it('loses write access when the admin revokes them, but the profile stays', async () => {
    await must(
      service.from('members').update({ access_status: 'revoked' }).eq('id', otherMemberId),
    );
    const rows = await must(
      other.from('members').update({ bio: 'still here?' }).eq('id', otherMemberId).select('id'),
    );
    expect(rows).toHaveLength(0);
    const { data } = await visitor.from('members').select('slug').eq('id', otherMemberId);
    expect(data).toHaveLength(1);
  });
});

describe('admin', () => {
  it('can edit any member, and add and remove members', async () => {
    expect(
      await must(
        admin.from('members').update({ bio: 'by admin' }).eq('id', crewMemberId).select('id'),
      ),
    ).toHaveLength(1);
    const added = await must(
      admin
        .from('members')
        .insert({ slug: `added-${run}`, name: 'Added' })
        .select('id')
        .single(),
    );
    created.members.push(added.id);
    expect(await must(admin.from('members').delete().eq('id', added.id).select('id'))).toHaveLength(
      1,
    );
  });

  it('can change identity and access fields of others', async () => {
    const rows = await must(
      admin
        .from('members')
        .update({ access_status: 'active' })
        .eq('id', otherMemberId)
        .select('id'),
    );
    expect(rows).toHaveLength(1);
  });

  it('can add, edit and delete projects, including the featured flag', async () => {
    const p = await must(
      admin
        .from('projects')
        .insert({ slug: `adm-${run}`, name: 'Adm' })
        .select('id')
        .single(),
    );
    created.projects.push(p.id);
    expect(
      await must(admin.from('projects').update({ featured: true }).eq('id', p.id).select('id')),
    ).toHaveLength(1);
    expect(
      await must(
        admin
          .from('projects')
          .update({ summary: 'by admin' })
          .eq('id', foreignProject)
          .select('id'),
      ),
    ).toHaveLength(1);
    expect(await must(admin.from('projects').delete().eq('id', p.id).select('id'))).toHaveLength(1);
  });

  it('can remove anyone from a project', async () => {
    await must(
      service
        .from('project_members')
        .upsert({ project_id: foreignProject, member_id: otherMemberId }),
    );
    expect(
      await must(
        admin
          .from('project_members')
          .delete()
          .eq('project_id', foreignProject)
          .eq('member_id', otherMemberId)
          .select(),
      ),
    ).toHaveLength(1);
  });

  it('can issue and revoke invites, and edit site settings', async () => {
    const inv = await must(
      admin
        .from('invites')
        .insert({
          member_id: otherMemberId,
          code_hash: 'hash',
          expires_at: new Date(Date.now() + 864e5).toISOString(),
        })
        .select('id')
        .single(),
    );
    expect(await must(admin.from('invites').delete().eq('id', inv.id).select('id'))).toHaveLength(
      1,
    );
    expect(
      await must(
        admin.from('site_settings').update({ intro_enabled: true }).eq('id', 1).select('id'),
      ),
    ).toHaveLength(1);
  });

  it('cannot create a second admin', async () => {
    const { error } = await service
      .from('members')
      .insert({ slug: `second-${run}`, name: 's', role: 'admin' });
    expect(error).not.toBeNull();
  });

  it('cannot write the audit log or the repo cache from the client', async () => {
    expect(
      (await admin.from('audit_log').insert({ table_name: 'x', action: 'x' })).error,
    ).not.toBeNull();
    expect(
      (await admin.from('audit_log').update({ action: 'x' }).eq('table_name', 'members')).error,
    ).not.toBeNull();
    expect(
      (await admin.from('audit_log').delete().eq('table_name', 'members')).error,
    ).not.toBeNull();
    expect((await admin.from('repo_cache').insert({ repo: 'a/b', data: {} })).error).not.toBeNull();
  });
});

describe('audit log', () => {
  it('records a crew edit with the previous value, readable by the admin only', async () => {
    await must(crew.from('members').update({ bio: 'first' }).eq('id', crewMemberId));
    await must(crew.from('members').update({ bio: 'second' }).eq('id', crewMemberId));
    const rows = await must(
      admin
        .from('audit_log')
        .select('action, table_name, previous, new')
        .eq('table_name', 'members')
        .eq('row_id', crewMemberId)
        .order('id', { ascending: false })
        .limit(1),
    );
    expect(rows[0].action).toBe('UPDATE');
    expect(rows[0].previous.bio).toBe('first');
    expect(rows[0].new.bio).toBe('second');
    expect(await must(crew.from('audit_log').select('*'))).toHaveLength(0);
    expect(adminMemberId).toBeTruthy();
  });
});
