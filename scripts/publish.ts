// Builds public/content.json from the backend. Run by the publish workflow; --dry-run uses the seed.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secrets), GITHUB_TOKEN (optional, raises rate limits).
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Snapshot } from '../src/content/schema';
import { fetchRepoDetails } from './lib/github';
import { buildSnapshot } from './lib/snapshot';

const out = 'public/content.json';
const write = (snap: Snapshot) => writeFileSync(out, JSON.stringify(snap, null, 2) + '\n');

if (process.argv.includes('--dry-run')) {
  const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
  write(snap);
  console.log(
    `dry run: wrote ${out} from the seed (${snap.projects.length} projects, ${snap.members.length} members); no network calls`,
  );
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
const db = createClient(url, key, { auth: { persistSession: false } });

async function rows<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const projects = await rows(db.from('projects').select('*').order('created_at'));

// Refresh repo details. A GitHub failure keeps the previous cache instead of failing the publish.
for (const repo of new Set(
  projects.map((p: { repo: string | null }) => p.repo).filter(Boolean) as string[],
)) {
  try {
    const data = await fetchRepoDetails(repo, process.env.GITHUB_TOKEN);
    await rows(db.from('repo_cache').upsert({ repo, data, fetched_at: data.fetchedAt }));
  } catch (e) {
    console.warn(`repo ${repo}: keeping cached details (${(e as Error).message})`);
  }
}

const snap = buildSnapshot({
  members: await rows(db.from('members').select('*').order('created_at')),
  projects,
  certifications: await rows(db.from('certifications').select('*').order('created_at')),
  projectMembers: await rows(db.from('project_members').select('project_id, member_id, role')),
  settings: await rows(db.from('site_settings').select('*').eq('id', 1).single()),
  repoCache: await rows(db.from('repo_cache').select('repo, data')),
});
write(snap);

// A trivial request keeps a free-tier project from pausing.
await rows(db.from('site_settings').select('id').limit(1));
console.log(`wrote ${out}: ${snap.projects.length} projects, ${snap.members.length} members`);
