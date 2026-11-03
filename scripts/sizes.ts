// Measures what a first visit downloads before the corridor can appear, from the built files (gzip, level 9).
// Run: npm run sizes   (after npm run build). The same function backs tests/budget.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

type Entry = { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[] };

const gz = (dist: string, file: string) =>
  gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;

export interface Budget {
  parts: Array<{ name: string; bytes: number }>;
  total: number;
  /** Chunks that load only on demand, so they are not part of the first visit. */
  lazy: Array<{ name: string; bytes: number }>;
}

export function corridorBudget(dist = 'dist'): Budget {
  const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8')) as Record<
    string,
    Entry
  >;
  const staticClosure = (key: string, into = new Set<string>()) => {
    if (into.has(key) || !manifest[key]) return into;
    into.add(key);
    (manifest[key].imports ?? []).forEach((k) => staticClosure(k, into));
    return into;
  };
  const filesOf = (keys: Set<string>) => {
    const files = new Set<string>();
    for (const k of keys) {
      files.add(manifest[k].file);
      manifest[k].css?.forEach((c) => files.add(c));
    }
    return files;
  };

  const app = filesOf(staticClosure('index.html'));
  const vault = filesOf(staticClosure('src/vault/VaultLayer.tsx'));
  for (const f of app) vault.delete(f);
  const sum = (files: Set<string>) => [...files].reduce((n, f) => n + gz(dist, f), 0);

  // Browsers fetch only the font files for the characters on the page: the Latin sets here.
  const fonts = Object.values(manifest)
    .map((e) => e.file)
    .filter((f) => /(inter-latin-(400|500)|jetbrains-mono-latin-400)-normal-.*\.woff2$/.test(f));

  const parts = [
    { name: 'HTML and snapshot', bytes: gz(dist, 'index.html') + gz(dist, 'content.json') },
    { name: 'App code and styles', bytes: sum(app) },
    { name: '3D chunk (three.js, scene, avatars)', bytes: sum(vault) },
    { name: 'Fonts used (Latin)', bytes: fonts.reduce((n, f) => n + gz(dist, f), 0) },
  ];
  const lazy = [
    ['Project room', 'src/vault/rooms/Room.tsx'],
    ['Sound engine', 'src/audio/engine.ts'],
    ['Dev panel', 'src/dev/Panel.tsx'],
  ].map(([name, key]) => ({
    name,
    bytes: [...filesOf(staticClosure(key))]
      .filter((f) => !app.has(f) && !vault.has(f))
      .reduce((n, f) => n + gz(dist, f), 0),
  }));
  return { parts, total: parts.reduce((n, p) => n + p.bytes, 0), lazy };
}

if (process.argv[1]?.endsWith('sizes.ts')) {
  const b = corridorBudget();
  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  for (const p of b.parts) console.log(p.name.padEnd(40), kb(p.bytes).padStart(10));
  console.log('Total before the corridor'.padEnd(40), kb(b.total).padStart(10));
  for (const p of b.lazy) console.log(`(on demand) ${p.name}`.padEnd(40), kb(p.bytes).padStart(10));
}
