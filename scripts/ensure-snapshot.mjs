// Dev and build need a content.json; fall back to the placeholder seed when none was published.
import { copyFileSync, existsSync } from 'node:fs';
if (!existsSync('public/content.json')) {
  copyFileSync('content/seed/content.json', 'public/content.json');
  console.log('public/content.json missing: copied the placeholder seed');
}
