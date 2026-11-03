// Renders the 3D crew, mark and trophy with Blender (headless) and saves small WebP files.
// Run: npm run render:3d   (needs Blender; set BLENDER if it is not at the default macOS path)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describeAvatar } from '../src/avatar/kit';
import { Snapshot } from '../src/content/schema';

const BLENDER = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';
if (!existsSync(BLENDER)) {
  console.error(`Blender not found at ${BLENDER}. Set BLENDER to its path.`);
  process.exit(1);
}

const swatches = Object.fromEntries(
  [
    ...readFileSync('design/avatar-swatches.css', 'utf8').matchAll(
      /--([a-z]+-\d+):\s*(#[0-9a-f]{6})/gi,
    ),
  ].map((m) => [m[1], m[2]]),
);
const hex = (name: string) => swatches[name] ?? '#888888';

const snap = Snapshot.parse(JSON.parse(readFileSync('content/seed/content.json', 'utf8')));
const tmp = join('blender', '.tmp');
const out = join('public', '3d');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(join(out, 'crew'), { recursive: true });

const blender = (args: string[]) =>
  execFileSync(BLENDER, ['-b', '-P', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });

async function toWebp(png: string, webp: string, size: number) {
  await sharp(png)
    .resize(size, size, { fit: 'inside' })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(webp);
}

for (const m of snap.members) {
  const s = describeAvatar(m.avatar);
  const job = {
    ...s,
    skin: hex(s.skin),
    hair: { ...s.hair, color: hex(s.hair.color) },
    facialHair: { ...s.facialHair, color: hex(s.facialHair.color) },
    glasses: { ...s.glasses, color: hex(s.glasses.color) },
    outfit: { ...s.outfit, color: hex(s.outfit.color) },
  };
  const file = join(tmp, `${m.slug}.json`);
  writeFileSync(file, JSON.stringify(job));
  for (const expr of ['a', 'b']) {
    const png = join(tmp, `${m.slug}-${expr}.png`);
    blender(['blender/character.py', '--', file, png, expr]);
    await toWebp(png, join(out, 'crew', `${m.slug}-${expr}.webp`), 480);
  }
  console.log(`rendered ${m.slug}`);
}

for (const kind of ['alpha', 'trophy']) {
  const png = join(tmp, `${kind}.png`);
  blender(['blender/props.py', '--', kind, png]);
  await toWebp(png, join(out, `${kind}.webp`), kind === 'alpha' ? 720 : 360);
  console.log(`rendered ${kind}`);
}

writeFileSync(
  'src/site/renders.json',
  JSON.stringify({ crew: snap.members.map((m) => m.slug), alpha: true, trophy: true }, null, 2) +
    '\n',
);
rmSync(tmp, { recursive: true, force: true });
console.log('wrote src/site/renders.json');
