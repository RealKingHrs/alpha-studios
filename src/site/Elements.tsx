import type { Snapshot } from '../content/schema';
import { accentFor } from './data';

/** The tech behind our work as a periodic table: one tile per technology, heavier where more projects use it. */
export function elementsOf(snap: Snapshot) {
  const count = new Map<string, number>();
  for (const p of snap.projects) for (const t of p.tech) count.set(t, (count.get(t) ?? 0) + 1);
  const used = new Set<string>();
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, weight], i) => {
      // A short symbol from the name's letters, unique within the table.
      const letters = name.replace(/[^a-z]/gi, '');
      let symbol = letters.slice(0, 2);
      for (let k = 2; used.has(symbol) && k < letters.length; k++) symbol = letters[0] + letters[k];
      symbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
      used.add(symbol);
      return { name, weight, number: i + 1, symbol };
    });
}

export function Elements({ snap, num }: { snap: Snapshot; num?: string }) {
  const tiles = elementsOf(snap);
  if (tiles.length === 0) return null;
  return (
    <section
      id="stack"
      data-section={num ? true : undefined}
      className="s-section elements"
      aria-labelledby="elements-title"
    >
      <div className="s-wrap">
        <p className="s-eyebrow mono">{num && <span className="s-num">{num}</span>} The stack</p>
        <h2 id="elements-title" className="display">
          The Elements
        </h2>
        <p className="s-lede">What our work is made of. Heavier means more projects use it.</p>
        <ul className="el-grid">
          {tiles.map((t, i) => (
            <li key={t.name} className={`el a-${accentFor(i)}`}>
              <span className="el-n mono">{t.number}</span>
              <span className="el-sym display" aria-hidden="true">
                {t.symbol}
              </span>
              <span className="el-name">{t.name}</span>
              <span className="el-w mono">
                {t.weight} {t.weight === 1 ? 'project' : 'projects'}
              </span>
            </li>
          ))}
          <li className="el el--next" aria-label="Next release, loading">
            <span className="el-n mono">?</span>
            <span className="el-sym display" aria-hidden="true">
              ??
            </span>
            <span className="el-name">Next release</span>
            <span className="el-w mono">loading</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
