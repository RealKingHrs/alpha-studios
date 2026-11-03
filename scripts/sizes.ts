// Measures what a first visit downloads, from the built files (gzip, level 9).
// Run: npm run sizes   (after npm run build). The same function backs tests/budget.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

type Entry = { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[] };

const gz = (dist: string, file: string) =>
  gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;

export interface Budget {
  /** The bright site on a first visit. */
  parts: Array<{ name: string; bytes: number }>;
  total: number;
  /** Files the first visit loads, so tests can inspect them. */
  siteFiles: string[];
}

export function siteBudget(dist = 'dist'): Budget {
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
  const sum = (files: Iterable<string>) => [...files].reduce((n, f) => n + gz(dist, f), 0);

  const app = filesOf(staticClosure('index.html'));
  // Browsers fetch only the font files for the characters on the page: the Latin sets here.
  const fonts = Object.values(manifest)
    .map((e) => e.file)
    .filter((f) =>
      /(inter-latin-(400|500)|jetbrains-mono-latin-400|fraunces-latin-soft)-normal.*\.woff2$/.test(
        f,
      ),
    );

  const parts = [
    { name: 'HTML and snapshot', bytes: gz(dist, 'index.html') + gz(dist, 'content.json') },
    { name: 'App code and styles', bytes: sum(app) },
    { name: 'Fonts used (Latin)', bytes: sum(fonts) },
  ];
  return {
    parts,
    total: parts.reduce((n, p) => n + p.bytes, 0),
    siteFiles: [...app],
  };
}

if (process.argv[1]?.endsWith('sizes.ts')) {
  const b = siteBudget();
  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  for (const p of b.parts) console.log(p.name.padEnd(42), kb(p.bytes).padStart(10));
  console.log('Total, first visit'.padEnd(42), kb(b.total).padStart(10));
}
