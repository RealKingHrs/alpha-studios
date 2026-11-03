import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  must,
  restoreAdmins,
  run,
  service,
  signedIn,
  stepAsideAdmins,
  url,
  visitorKey,
} from './helpers';

// The whole sign-in against the real function: PIN, one-time code, session, and what the session may do.
// Needs the function to be served: npx supabase functions serve portal-pin --no-verify-jwt
// (it skips itself otherwise). The mail step needs a mail server, so the code comes from the admin API instead.

const fn = `${url}/functions/v1/portal-pin`;
const call = (body: unknown) =>
  fetch(fn, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

let served = false;
let steppedAside: string[] = [];
const created: string[] = [];
const userIds: string[] = [];

beforeAll(async () => {
  try {
    served = (await fetch(fn, { method: 'OPTIONS' })).status === 204;
  } catch {
    served = false;
  }
  steppedAside = await stepAsideAdmins();
});

afterAll(async () => {
  await service.from('members').delete().in('id', created);
  await restoreAdmins(steppedAside);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe('portal-pin end to end', () => {
  it('signs a new member in with a PIN and a code, once linked keeps them to their own rights', async (ctx) => {
    if (!served) return ctx.skip();
    const a = await signedIn('e2eadmin');
    userIds.push(a.userId);
    const adminMember = await must(
      service
        .from('members')
        .insert({
          slug: `e2e-admin-${run}`,
          name: 'E2E admin',
          user_id: a.userId,
          role: 'admin',
          access_status: 'active',
        })
        .select('id')
        .single(),
    );
    created.push(adminMember.id);
    const crewMember = await must(
      service
        .from('members')
        .insert({
          slug: `e2e-crew-${run}`,
          name: 'E2E crew',
          role: 'crew',
          access_status: 'invited',
        })
        .select('id')
        .single(),
    );
    created.push(crewMember.id);
    const email = `e2e-${run}@example.test`;
    await must(a.client.rpc('set_member_email', { p_member: crewMember.id, p_email: email }));
    const pin = (await must(a.client.rpc('issue_pin', { p_member: crewMember.id }))) as string;

    // A wrong PIN is refused; the right one reaches the mail step (which has no mail server here).
    expect((await call({ action: 'start', pin: 'ZZZZZ' })).status).toBe(401);
    const start = await call({ action: 'start', pin });
    expect([200, 502]).toContain(start.status);
    const startBody = JSON.stringify(await start.json());
    expect(startBody).not.toContain(email);

    // The code, taken from the admin API because there is no inbox in this stack.
    const link = await service.auth.admin.generateLink({ type: 'magiclink', email });
    const code = link.data.properties?.email_otp as string;
    userIds.push(link.data.user!.id);
    expect((await call({ action: 'verify', pin, token: '000000' })).status).toBe(401);
    const verify = await call({ action: 'verify', pin, token: code });
    expect(verify.status).toBe(200);
    const body = await verify.json();
    expect(body.member).toBe(`e2e-crew-${run}`);

    // The session works and is linked to the member, with crew rights only.
    const anon = createClient(url, visitorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await anon.auth.setSession(body.session);
    const me = await must(
      anon.from('members').select('id, role, access_status').eq('slug', `e2e-crew-${run}`).single(),
    );
    expect(me).toMatchObject({ role: 'crew', access_status: 'active' });
    expect((await anon.rpc('issue_pin', { p_member: crewMember.id })).error).not.toBeNull();
    expect(
      (await anon.from('members').update({ role: 'admin' }).eq('id', crewMember.id)).error,
    ).not.toBeNull();
  });
});
