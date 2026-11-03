// Makes the first admin sign-in. It runs on YOUR machine, invents a PIN, prints the PIN once, and prints one SQL
// statement to paste into the Supabase SQL editor. The PIN is never saved anywhere and nobody else sees it.
// Run: npm run admin:sql  (optionally: npm run admin:sql -- --email you@example.com --slug your-slug)
import { randomBytes } from 'node:crypto';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const email = arg('email', 'dustmail20@gmail.com').trim().toLowerCase();
const slug = arg('slug', 'hari-rudran-sunil');
const name = arg('name', 'Hari Rudran Sunil');
const title = arg('title', 'Founder');

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('That does not look like an email address.');
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('The slug may only contain lower case letters, numbers and single hyphens.');
  process.exit(1);
}
const q = (s) => s.replace(/'/g, "''");

// Same alphabet as the wheels: no I, O, 0 or 1. 256 divides by 32, so every character is equally likely.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const pin = [...randomBytes(5)].map((b) => ALPHABET[b % 32]).join('');

console.log(`
Your admin PIN is:  ${pin}

Write it down now (a password manager is best). It is shown only this once and is not stored on this computer.
You can issue yourself a new one later from the portal's Crew screen.

Now open your Supabase project, SQL Editor, paste ALL of this and press Run:
-----------------------------------------------------------------------------
begin;
-- Your public profile (kept if it already exists) becomes the one and only admin.
insert into public.members (slug, name, role_title, role, access_status)
  values ('${q(slug)}', '${q(name)}', '${q(title)}', 'admin', 'invited')
  on conflict (slug) do update set role = 'admin';
insert into public.member_access (member_id, email, pin_hash, pin_set_at)
  select id, '${q(email)}', extensions.crypt('${pin}', extensions.gen_salt('bf')), now()
  from public.members where slug = '${q(slug)}'
  on conflict (member_id) do update
    set email = excluded.email, pin_hash = excluded.pin_hash, pin_set_at = now();
commit;
-----------------------------------------------------------------------------
Then open the portal, set the five wheels to your PIN, and enter the code sent to ${email}.
`);
