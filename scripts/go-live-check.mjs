// A safe preflight before going live. It only reads local files and git; it sends nothing anywhere and
// never asks for or prints a credential. Run: npm run go-live:check
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return e.stdout?.toString().trim() ?? '';
  }
};
const results = [];
const check = (ok, label, fix) => results.push({ ok, label, fix });
const info = [];

const branch = run('git branch --show-current');
check(branch === 'main', `On the main branch (now: ${branch || 'none'})`, 'git checkout main');

const remote = run('git remote get-url origin');
check(
  /github\.com[:/].+\/.+/.test(remote),
  `A GitHub remote called origin is set (${remote || 'none'})`,
  'git remote add origin https://github.com/<your-username>/alpha-studios.git',
);

const dirty = run('git status --porcelain');
check(dirty === '', 'No uncommitted changes', 'git add -A && git commit -m "Version 1"');

// A real key looks like sb_secret_... or a long JWT (three dotted parts starting eyJ). The word service_role
// alone is just a database role name and appears in the migrations, so it is not a leak.
const leaks = run(
  'git grep -nE "sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{20,}" -- . ":(exclude)docs" ":(exclude)scripts/go-live-check.mjs" ":(exclude)tests"',
);
check(
  leaks === '',
  'No secret or service key in the tracked files',
  'Remove the lines this lists, then commit:\n' + leaks,
);

for (const [file, why] of [
  ['supabase/functions/portal-pin/handler.ts', 'The PIN sign-in function'],
  ['supabase/templates/otp.html', 'The sign-in code email'],
  ['scripts/admin-sql.mjs', 'The admin setup script'],
  ['docs/GO-LIVE.md', 'The go-live guide'],
])
  check(existsSync(file), `${why} is in the repo (${file})`, `Restore ${file}`);

check(
  existsSync('.github/workflows/publish.yml'),
  'The publish workflow is in the repo',
  'Restore .github/workflows/publish.yml',
);
check(
  !existsSync('.env') || !run('git ls-files .env'),
  '.env is not tracked',
  'git rm --cached .env',
);

if (existsSync('public/content.json')) {
  const left = run('npm run -s content:check public/content.json');
  info.push(
    left
      ? `Placeholder text is still in the content (visitors will see it):\n${left}`
      : 'Content has no placeholder text left.',
  );
}

for (const r of results)
  console.log(
    `${r.ok ? 'ok     ' : 'MISSING'}  ${r.label}${r.ok ? '' : `\n         fix: ${r.fix}`}`,
  );
console.log('');
for (const i of info) console.log(i + '\n');
console.log(
  'Set these in GitHub (Settings, Secrets and variables, Actions) after the first push. Names only, never paste them here:\n' +
    '  Variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY\n' +
    '  Secrets:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
);
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\n${bad} thing(s) to fix before going live.` : '\nReady to push.');
process.exit(bad ? 1 : 0);
