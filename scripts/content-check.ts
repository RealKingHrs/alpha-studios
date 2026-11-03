// Checks a content snapshot against the schema and lists placeholder text still in it.
// Run: npm run content:check [path]   (default: content/seed/content.json). Exits 1 if anything is left.
import { readFileSync } from 'node:fs';
import { Snapshot } from '../src/content/schema';

const file = process.argv[2] ?? 'content/seed/content.json';
const parsed = Snapshot.safeParse(JSON.parse(readFileSync(file, 'utf8')));
if (!parsed.success) {
  console.error(`${file} does not match the schema:`);
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}

const PLACEHOLDER =
  /placeholder|member (one|two|three|four|five)|project (one|two)|example\.(test|com)|\.example\b|lorem/i;

/** Every string in the snapshot with where it lives, so leftovers can be pointed to. */
function leftovers(value: unknown, path = ''): string[] {
  if (typeof value === 'string')
    return PLACEHOLDER.test(value) ? [`${path}: ${value.slice(0, 60)}`] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => leftovers(v, `${path}[${i}]`));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => leftovers(v, path ? `${path}.${k}` : k));
  return [];
}

{
  // Repository details are fetched by the publish job, not typed in.
  const typedIn = { ...parsed.data, repos: {} };
  const found = leftovers(typedIn);
  if (found.length === 0) console.log(`${file} is valid and has no placeholder text.`);
  else {
    console.log(`${file} is valid but still has ${found.length} placeholder strings:`);
    found.forEach((f) => console.log(`  ${f}`));
    process.exit(1);
  }
}
