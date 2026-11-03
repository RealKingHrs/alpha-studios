import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, run, service, signedIn, visitor, restoreAdmins, stepAsideAdmins } from './helpers';

// Certificates and the richer profile fields, with real sign-ins against the local stack.

let admin: SupabaseClient;
let crew: SupabaseClient;
let other: SupabaseClient;
let ids: { admin: string; crew: string; other: string };
let steppedAside: string[] = [];
const users: string[] = [];
const members: string[] = [];

async function member(slug: string, extra: Record<string, unknown>) {
  const row = await must(
    service
      .from('members')
      .insert({ slug: `${slug}-${run}`, name: slug, access_status: 'active', ...extra })
      .select('id')
      .single(),
  );
  members.push(row.id);
  return row.id as string;
}

beforeAll(async () => {
  const a = await signedIn('cadmin');
  const c = await signedIn('ccrew');
  const o = await signedIn('cother');
  [admin, crew, other] = [a.client, c.client, o.client];
  users.push(a.userId, c.userId, o.userId);
  steppedAside = await stepAsideAdmins();
  ids = {
    admin: await member('c-admin', { user_id: a.userId, role: 'admin' }),
    crew: await member('c-crew', { user_id: c.userId }),
    other: await member('c-other', { user_id: o.userId }),
  };
});

afterAll(async () => {
  await service.from('members').delete().in('id', members);
  await restoreAdmins(steppedAside);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe('certifications', () => {
  it('lets a member add, edit and remove their own, and nobody else', async () => {
    const made = await must(
      crew
        .from('certifications')
        .insert({ member_id: ids.crew, title: 'Mine' })
        .select('id')
        .single(),
    );
    const edited = await must(
      crew.from('certifications').update({ title: 'Mine v2' }).eq('id', made.id).select('title'),
    );
    expect(edited[0].title).toBe('Mine v2');

    const forged = await crew
      .from('certifications')
      .insert({ member_id: ids.other, title: 'Forged' });
    expect(forged.error).not.toBeNull();

    const touched = await must(
      other.from('certifications').update({ title: 'Hijack' }).eq('id', made.id).select('id'),
    );
    expect(touched).toHaveLength(0);
    const removed = await must(
      other.from('certifications').delete().eq('id', made.id).select('id'),
    );
    expect(removed).toHaveLength(0);

    await must(crew.from('certifications').delete().eq('id', made.id).select('id'));
  });

  it('is readable by visitors and editable by the admin', async () => {
    const made = await must(
      service
        .from('certifications')
        .insert({ member_id: ids.crew, title: 'Public' })
        .select('id')
        .single(),
    );
    const seen = await must(visitor.from('certifications').select('title').eq('id', made.id));
    expect(seen).toHaveLength(1);
    const edited = await must(
      admin
        .from('certifications')
        .update({ title: 'Admin edit' })
        .eq('id', made.id)
        .select('title'),
    );
    expect(edited[0].title).toBe('Admin edit');
    const refused = await visitor
      .from('certifications')
      .insert({ member_id: ids.crew, title: 'No' });
    expect(refused.error).not.toBeNull();
  });

  it('rejects an expiry before the issue date and a non-web link', async () => {
    const bad = await crew.from('certifications').insert({
      member_id: ids.crew,
      title: 'Bad',
      issued_on: '2026-05-01',
      expires_on: '2026-01-01',
    });
    expect(bad.error).not.toBeNull();
    const link = await crew
      .from('certifications')
      .insert({ member_id: ids.crew, title: 'Link', credential_url: 'javascript:alert(1)' });
    expect(link.error).not.toBeNull();
  });

  it('lets the admin revert a deletion and an edit, and the changes are audited', async () => {
    const made = await must(
      crew
        .from('certifications')
        .insert({ member_id: ids.crew, title: 'Revertable' })
        .select('id')
        .single(),
    );
    await must(
      crew.from('certifications').update({ title: 'Changed' }).eq('id', made.id).select('id'),
    );
    const log = await must(
      service
        .from('audit_log')
        .select('id, action')
        .eq('table_name', 'certifications')
        .eq('row_id', made.id)
        .order('id'),
    );
    expect(log.map((l: { action: string }) => l.action)).toEqual(['INSERT', 'UPDATE']);

    expect((await crew.rpc('revert_audit', { p_id: log[1].id })).error).not.toBeNull();
    const ok = await admin.rpc('revert_audit', { p_id: log[1].id });
    expect(ok.data).toMatchObject({ ok: true });
    const back = await must(service.from('certifications').select('title').eq('id', made.id));
    expect(back[0].title).toBe('Revertable');

    await crew.from('certifications').delete().eq('id', made.id);
    const del = await must(
      service
        .from('audit_log')
        .select('id')
        .eq('table_name', 'certifications')
        .eq('row_id', made.id)
        .eq('action', 'DELETE')
        .single(),
    );
    expect((await admin.rpc('revert_audit', { p_id: del.id })).data).toMatchObject({ ok: true });
    expect(await must(service.from('certifications').select('id').eq('id', made.id))).toHaveLength(
      1,
    );
  });
});

describe('profile fields', () => {
  it('lets a member edit their own card fields but not another member’s', async () => {
    const mine = await must(
      crew
        .from('members')
        .update({ codename: 'The Tester', skills: [{ name: 'Postgres', level: 4 }] })
        .eq('id', ids.crew)
        .select('codename'),
    );
    expect(mine[0].codename).toBe('The Tester');
    const theirs = await must(
      crew.from('members').update({ codename: 'Hijack' }).eq('id', ids.other).select('id'),
    );
    expect(theirs).toHaveLength(0);
  });

  it('shows the new fields to visitors', async () => {
    const seen = await must(
      visitor.from('members').select('codename, tagline, skills').eq('id', ids.crew),
    );
    expect(seen[0].codename).toBe('The Tester');
  });

  it('lets a member set their own role on a project, not another member’s', async () => {
    const project = await must(
      service
        .from('projects')
        .insert({ slug: `c-proj-${run}`, name: 'c' })
        .select('id')
        .single(),
    );
    await service.from('project_members').insert([
      { project_id: project.id, member_id: ids.crew },
      { project_id: project.id, member_id: ids.other },
    ]);
    const mine = await must(
      crew
        .from('project_members')
        .update({ role: 'Lead' })
        .eq('project_id', project.id)
        .eq('member_id', ids.crew)
        .select('role'),
    );
    expect(mine[0].role).toBe('Lead');
    const theirs = await must(
      crew
        .from('project_members')
        .update({ role: 'Nope' })
        .eq('project_id', project.id)
        .eq('member_id', ids.other)
        .select('role'),
    );
    expect(theirs).toHaveLength(0);
    await service.from('projects').delete().eq('id', project.id);
  });
});

describe('member details and certificate fields', () => {
  it('lets a member edit their own details and refuses edits to someone else’s', async () => {
    const mine = await must(
      crew
        .from('members')
        .update({
          location: 'Pune, India',
          open_to: 'Mentoring',
          languages: ['English', 'Hindi'],
          interests: ['Chess'],
          experience: [{ title: 'Engineer', org: 'Acme', from: '2022', to: 'Now', note: '' }],
          education: [{ school: 'Example University', field: 'CS', from: '2018', to: '2022' }],
        })
        .eq('id', ids.crew)
        .select('location, languages'),
    );
    expect(mine[0]).toMatchObject({ location: 'Pune, India', languages: ['English', 'Hindi'] });
    const theirs = await must(
      crew.from('members').update({ location: 'Nowhere' }).eq('id', ids.other).select('id'),
    );
    expect(theirs).toHaveLength(0);
    const seen = await must(
      visitor.from('members').select('location, experience').eq('id', ids.crew),
    );
    expect(seen[0].experience).toHaveLength(1);
  });

  it('rejects too many roles', async () => {
    const roles = Array.from({ length: 9 }, (_, i) => ({ title: `Role ${i}` }));
    const bad = await crew.from('members').update({ experience: roles }).eq('id', ids.crew);
    expect(bad.error).not.toBeNull();
  });

  it('stores a certificate description and credential id, readable by visitors, and reverts them', async () => {
    const made = await must(
      crew
        .from('certifications')
        .insert({
          member_id: ids.crew,
          title: 'Detailed',
          description: 'Covers the basics',
          credential_id: 'ABC-123',
        })
        .select('id')
        .single(),
    );
    const seen = await must(
      visitor.from('certifications').select('description, credential_id').eq('id', made.id),
    );
    expect(seen[0]).toEqual({ description: 'Covers the basics', credential_id: 'ABC-123' });
    await must(
      crew
        .from('certifications')
        .update({ credential_id: 'CHANGED' })
        .eq('id', made.id)
        .select('id'),
    );
    const log = await must(
      service
        .from('audit_log')
        .select('id')
        .eq('table_name', 'certifications')
        .eq('row_id', made.id)
        .eq('action', 'UPDATE')
        .single(),
    );
    expect((await admin.rpc('revert_audit', { p_id: log.id })).data).toMatchObject({ ok: true });
    const back = await must(
      service.from('certifications').select('credential_id').eq('id', made.id),
    );
    expect(back[0].credential_id).toBe('ABC-123');
    await service.from('certifications').delete().eq('id', made.id);
  });
});
