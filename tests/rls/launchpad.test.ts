import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, run, service, signedIn, visitor, restoreAdmins, stepAsideAdmins } from './helpers';

// Launchpad: pitches, review, approval and the permanent founder credit, against the local stack.

let admin: SupabaseClient;
let pitcher: SupabaseClient;
let other: SupabaseClient;
let steppedAside: string[] = [];
const users: string[] = [];
const members: string[] = [];
const projects: string[] = [];

const pitch = (name: string, extra: Record<string, unknown> = {}) => ({
  pitcher_name: 'Indie Dev',
  project_name: name,
  pitch: 'A small idea that needs a backend and a launch plan.',
  platforms: ['ios', 'web'],
  help_wanted: ['funding', 'backend'],
  ...extra,
});

beforeAll(async () => {
  const a = await signedIn('ladmin');
  const p = await signedIn('lpitcher');
  const o = await signedIn('lother');
  [admin, pitcher, other] = [a.client, p.client, o.client];
  users.push(a.userId, p.userId, o.userId);
  steppedAside = await stepAsideAdmins();
  const row = await must(
    service
      .from('members')
      .insert({
        slug: `l-admin-${run}`,
        name: 'l-admin',
        user_id: a.userId,
        role: 'admin',
        access_status: 'active',
      })
      .select('id')
      .single(),
  );
  members.push(row.id);
});

afterAll(async () => {
  // The locked credit blocks deletion from the app, so the cleanup goes through the backend owner (no signed-in user).
  await service.from('projects').delete().in('id', projects);
  await service.from('members').delete().in('id', members);
  await restoreAdmins(steppedAside);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe('submissions', () => {
  it('lets a signed-in person pitch and read only their own', async () => {
    const mine = await must(
      pitcher
        .from('submissions')
        .insert(pitch(`Mine ${run}`))
        .select('id, status')
        .single(),
    );
    expect(mine.status).toBe('new');
    expect(await must(pitcher.from('submissions').select('id').eq('id', mine.id))).toHaveLength(1);
    expect(await must(other.from('submissions').select('id').eq('id', mine.id))).toHaveLength(0);
    expect(await must(admin.from('submissions').select('id').eq('id', mine.id))).toHaveLength(1);
  });

  it('refuses visitors, forged owners, self-approval and edits by the pitcher', async () => {
    expect((await visitor.from('submissions').insert(pitch('Anon'))).error).not.toBeNull();
    expect(
      (await pitcher.from('submissions').insert(pitch('Forged', { user_id: users[2] }))).error,
    ).not.toBeNull();
    expect(
      (await pitcher.from('submissions').insert(pitch('Pre-approved', { status: 'approved' })))
        .error,
    ).not.toBeNull();
    const mine = await must(
      pitcher
        .from('submissions')
        .insert(pitch(`Edit ${run}`))
        .select('id')
        .single(),
    );
    const changed = await must(
      pitcher.from('submissions').update({ status: 'approved' }).eq('id', mine.id).select('id'),
    );
    expect(changed).toHaveLength(0);
    expect(
      (
        await pitcher
          .from('submissions')
          .insert(pitch('Bad help', { help_wanted: ['money-printer'] }))
      ).error,
    ).not.toBeNull();
  });

  it('lets the admin review and add notes', async () => {
    const row = await must(
      pitcher
        .from('submissions')
        .insert(pitch(`Review ${run}`))
        .select('id')
        .single(),
    );
    const done = await must(
      admin
        .from('submissions')
        .update({ status: 'reviewing', reviewer_notes: 'Looks promising' })
        .eq('id', row.id)
        .select('status'),
    );
    expect(done[0].status).toBe('reviewing');
    expect(
      await must(pitcher.from('submissions').select('reviewer_notes').eq('id', row.id)),
    ).toHaveLength(1);
  });
});

describe('approval and the founder credit', () => {
  let projectId: string;
  let projectSlug: string;

  it('lets only the admin approve, creating a locked project and an unclaimed founder profile', async () => {
    const row = await must(
      pitcher
        .from('submissions')
        .insert(pitch(`Approve ${run}`))
        .select('id')
        .single(),
    );
    projectSlug = `lp-${run}`;
    expect(
      (
        await pitcher.rpc('approve_submission', {
          p_id: row.id,
          p_slug: projectSlug,
          p_member_slug: `lf-${run}`,
        })
      ).error,
    ).not.toBeNull();

    const res = await admin.rpc('approve_submission', {
      p_id: row.id,
      p_slug: projectSlug,
      p_member_slug: `lf-${run}`,
    });
    expect(res.error).toBeNull();
    expect(res.data).toMatchObject({ ok: true });
    members.push(res.data.member);

    const p = await must(
      visitor
        .from('projects')
        .select('id, origin, founder_name, founder_credit_locked')
        .eq('slug', projectSlug)
        .single(),
    );
    projectId = p.id;
    projects.push(p.id);
    expect(p).toMatchObject({
      origin: 'launchpad',
      founder_name: 'Indie Dev',
      founder_credit_locked: true,
    });

    const sub = await must(
      pitcher.from('submissions').select('status, project_id').eq('id', row.id).single(),
    );
    expect(sub).toMatchObject({ status: 'approved', project_id: projectId });
    expect(
      (
        await admin.rpc('approve_submission', {
          p_id: row.id,
          p_slug: `${projectSlug}-b`,
          p_member_slug: `lf2-${run}`,
        })
      ).data,
    ).toMatchObject({ ok: false });
  });

  it('stops the admin changing or removing a locked founder credit', async () => {
    const rename = await admin
      .from('projects')
      .update({ founder_name: 'Someone Else' })
      .eq('id', projectId);
    expect(rename.error).not.toBeNull();
    const unlock = await admin
      .from('projects')
      .update({ founder_credit_locked: false })
      .eq('id', projectId);
    expect(unlock.error).not.toBeNull();
    const remove = await admin.from('projects').delete().eq('id', projectId);
    expect(remove.error).not.toBeNull();
    const still = await must(
      service.from('projects').select('founder_name').eq('id', projectId).single(),
    );
    expect(still.founder_name).toBe('Indie Dev');
    // Ordinary edits to a locked project still work.
    const ok = await must(
      admin.from('projects').update({ summary: 'Updated' }).eq('id', projectId).select('summary'),
    );
    expect(ok[0].summary).toBe('Updated');
  });

  it('stops anyone setting a founder credit outside the approval function', async () => {
    const forged = await admin.from('projects').insert({
      slug: `lforge-${run}`,
      name: 'Forged',
      origin: 'launchpad',
      founder_name: 'X',
      founder_credit_locked: true,
    });
    expect(forged.error).not.toBeNull();
    const plain = await must(
      admin
        .from('projects')
        .insert({ slug: `lplain-${run}`, name: 'Plain' })
        .select('id')
        .single(),
    );
    projects.push(plain.id);
    expect(
      (await admin.from('projects').update({ founder_name: 'Y' }).eq('id', plain.id)).error,
    ).not.toBeNull();
  });

  it('lets the backend owner, and only them, remove a credit on purpose', async () => {
    const res = await service
      .from('projects')
      .update({ founder_credit_locked: false })
      .eq('id', projectId);
    expect(res.error).toBeNull();
    await service.from('projects').update({ founder_credit_locked: true }).eq('id', projectId);
  });
});
