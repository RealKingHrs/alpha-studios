import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, restoreAdmins, run, service, signedIn, stepAsideAdmins, visitor } from './helpers';

// PIN sign-in, against the local stack: who can set emails and issue PINs, that PINs are only ever stored as
// hashes, how the service-side lookup rate limits, and that a login links to a member once.

let admin: SupabaseClient;
let crew: SupabaseClient;
let steppedAside: string[] = [];
const users: string[] = [];
const members: string[] = [];
let crewMember: string;
let adminMember: string;
let crewUser: string;
const ip = `ip-${run}`;
const tag = (s: string) => `${s}-${run}`;

async function member(slug: string, userId: string | null, role: 'crew' | 'admin' = 'crew') {
  const row = await must(
    service
      .from('members')
      .insert({ slug: tag(slug), name: slug, user_id: userId, role, access_status: 'active' })
      .select('id')
      .single(),
  );
  members.push(row.id);
  return row.id as string;
}

beforeAll(async () => {
  const a = await signedIn('padmin');
  const c = await signedIn('pcrew');
  [admin, crew] = [a.client, c.client];
  crewUser = c.userId;
  users.push(a.userId, c.userId);
  steppedAside = await stepAsideAdmins();
  adminMember = await member('p-admin', a.userId, 'admin');
  crewMember = await member('p-crew', null);
});

afterAll(async () => {
  await service.from('pin_attempts').delete().like('ip_hash', `%${run}%`);
  await service.from('members').delete().in('id', members);
  await restoreAdmins(steppedAside);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe('who may set emails and issue PINs', () => {
  it('lets only the admin set an email and issue a PIN', async () => {
    expect(
      (
        await crew.rpc('set_member_email', {
          p_member: crewMember,
          p_email: `c-${run}@example.test`,
        })
      ).error,
    ).not.toBeNull();
    expect((await crew.rpc('issue_pin', { p_member: crewMember })).error).not.toBeNull();
    expect((await visitor.rpc('issue_pin', { p_member: crewMember })).error).not.toBeNull();
    await must(
      admin.rpc('set_member_email', { p_member: crewMember, p_email: `C-${run}@Example.test` }),
    );
    const pin = (await must(admin.rpc('issue_pin', { p_member: crewMember }))) as string;
    expect(pin).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
  });

  it('refuses a PIN before an email is set', async () => {
    const lone = await member('p-lone', null);
    expect((await admin.rpc('issue_pin', { p_member: lone })).error).not.toBeNull();
  });

  it('keeps emails and hashes away from visitors and crew, and the hash from everyone', async () => {
    expect((await visitor.from('member_access').select('email')).error).not.toBeNull();
    expect(await must(crew.from('member_access').select('email'))).toHaveLength(0);
    expect(await must(admin.from('member_access').select('email, member_id'))).not.toHaveLength(0);
    expect((await admin.from('member_access').select('pin_hash')).error).not.toBeNull();
    // Nothing about the email or PIN leaks through the public members table.
    const { data } = await visitor.from('members').select('*').eq('id', crewMember).single();
    expect(JSON.stringify(data)).not.toMatch(/example\.test|pin_hash/);
  });

  it('stores the email in lower case and only one person per email', async () => {
    const row = await must(
      service.from('member_access').select('email').eq('member_id', crewMember).single(),
    );
    expect(row.email).toBe(`c-${run}@example.test`);
    const other = await member('p-dupe', null);
    expect(
      (await admin.rpc('set_member_email', { p_member: other, p_email: `c-${run}@example.test` }))
        .error,
    ).not.toBeNull();
  });
});

describe('looking a PIN up', () => {
  let pin: string;
  beforeAll(async () => {
    pin = (await must(admin.rpc('issue_pin', { p_member: crewMember }))) as string;
  });

  it('is only callable by the service, never by crew, visitors or the admin in the browser', async () => {
    for (const client of [crew, admin, visitor])
      expect((await client.rpc('pin_find', { p_pin: pin, p_ip_hash: ip })).error).not.toBeNull();
  });

  it('finds the member and the email for the right PIN, in any case', async () => {
    const hit = await must(
      service.rpc('pin_find', { p_pin: pin.toLowerCase(), p_ip_hash: `ok-${ip}` }),
    );
    expect(hit).toMatchObject({ found: true, member: crewMember, email: `c-${run}@example.test` });
  });

  it('says only "not found" for a wrong PIN, and a reissued PIN replaces the old one', async () => {
    const miss = await must(service.rpc('pin_find', { p_pin: 'ZZZZZ', p_ip_hash: `miss-${ip}` }));
    expect(miss).toEqual({ found: false });
    const fresh = (await must(admin.rpc('issue_pin', { p_member: crewMember }))) as string;
    expect(fresh).not.toBe(pin);
    const old = await must(service.rpc('pin_find', { p_pin: pin, p_ip_hash: `old-${ip}` }));
    expect(old).toEqual({ found: false });
    const hit = await must(service.rpc('pin_find', { p_pin: fresh, p_ip_hash: `new-${ip}` }));
    expect(hit).toMatchObject({ found: true });
  });

  it('locks a caller out after five wrong tries, even with the right PIN', async () => {
    const fresh = (await must(admin.rpc('issue_pin', { p_member: crewMember }))) as string;
    const who = `lock-${ip}`;
    for (let i = 0; i < 5; i++) await service.rpc('pin_find', { p_pin: 'AAAAA', p_ip_hash: who });
    const locked = await must(service.rpc('pin_find', { p_pin: fresh, p_ip_hash: who }));
    expect(locked).toEqual({ locked: true });
    const elsewhere = await must(
      service.rpc('pin_find', { p_pin: fresh, p_ip_hash: `else-${ip}` }),
    );
    expect(elsewhere).toMatchObject({ found: true });
  });

  it('does not find a revoked member', async () => {
    const fresh = (await must(admin.rpc('issue_pin', { p_member: crewMember }))) as string;
    await service.from('members').update({ access_status: 'revoked' }).eq('id', crewMember);
    const hit = await must(service.rpc('pin_find', { p_pin: fresh, p_ip_hash: `rev-${ip}` }));
    expect(hit).toEqual({ found: false });
    await service.from('members').update({ access_status: 'active' }).eq('id', crewMember);
  });
});

describe('linking a login', () => {
  it('links once, refuses a different login, and unlinks when the email changes', async () => {
    const slug = await must(service.rpc('pin_link', { p_member: crewMember, p_user: crewUser }));
    expect(slug).toBe(tag('p-crew'));
    const linked = await must(
      service.from('members').select('user_id, access_status').eq('id', crewMember).single(),
    );
    expect(linked).toEqual({ user_id: crewUser, access_status: 'active' });
    // Someone else's login cannot take the seat.
    const stranger = await service.auth.admin.createUser({
      email: `stranger-${run}@example.test`,
      email_confirm: true,
    });
    users.push(stranger.data.user!.id);
    const taken = await must(
      service.rpc('pin_link', { p_member: crewMember, p_user: stranger.data.user!.id }),
    );
    expect(taken).toBeNull();
    // A new email unlinks the old login.
    await must(
      admin.rpc('set_member_email', { p_member: crewMember, p_email: `n-${run}@example.test` }),
    );
    const after = await must(
      service.from('members').select('user_id, access_status').eq('id', crewMember).single(),
    );
    expect(after).toEqual({ user_id: null, access_status: 'invited' });
  });

  it('writes an audit entry for every PIN issue and email change', async () => {
    const rows = await must(
      admin
        .from('audit_log')
        .select('action')
        .eq('table_name', 'member_access')
        .eq('row_id', crewMember),
    );
    const actions = rows.map((r: { action: string }) => r.action);
    expect(actions).toContain('ISSUE_PIN');
    expect(actions).toContain('SET_EMAIL');
  });

  it('lets the admin issue their own PIN', async () => {
    await must(
      admin.rpc('set_member_email', { p_member: adminMember, p_email: `a-${run}@example.test` }),
    );
    const pin = await must(admin.rpc('issue_pin', { p_member: adminMember }));
    expect(String(pin)).toHaveLength(5);
  });
});
