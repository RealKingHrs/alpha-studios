// Local development only: creates a throwaway admin and a crew login on the LOCAL Supabase stack and writes
// .env.local so the portal build can reach it. Refuses to run against anything but localhost.
// Run: npm run dev:users   (needs `npx supabase start`)
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const url: string = env.API_URL;
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(
    `Refusing to create test users against ${url}: this script is for the local stack only.`,
  );
}
const db = createClient(url, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const admin = { email: 'admin@alpha.test', password: `a-${randomBytes(9).toString('base64url')}` };
const crew = { email: 'crew@alpha.test', password: `c-${randomBytes(9).toString('base64url')}` };

async function user(u: { email: string; password: string }) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
  const old = list.users.find((x) => x.email === u.email);
  if (old) await db.auth.admin.deleteUser(old.id);
  const { data, error } = await db.auth.admin.createUser({ ...u, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

const adminId = await user(admin);
const crewId = await user(crew);

await db.from('members').update({ role: 'crew' }).eq('role', 'admin');
await db.from('members').delete().eq('slug', 'studio-admin');
const a = await db.from('members').insert({
  slug: 'studio-admin',
  name: 'Studio admin',
  role_title: 'Admin',
  role: 'admin',
  user_id: adminId,
  access_status: 'active',
  consented_at: new Date().toISOString(),
});
if (a.error) throw a.error;
const c = await db
  .from('members')
  .update({ user_id: crewId, access_status: 'active', consented_at: new Date().toISOString() })
  .eq('slug', 'aarav-menon');
if (c.error) throw c.error;

writeFileSync('.env.local', `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${env.ANON_KEY}\n`);
writeFileSync(
  '.dev-credentials',
  `admin ${admin.email} ${admin.password}\ncrew ${crew.email} ${crew.password}\n`,
);
console.log(
  'Created local admin and crew logins. Credentials are in .dev-credentials (not committed). Wrote .env.local.',
);
