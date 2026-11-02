import { useEffect, useState } from 'react';
import { stats, transferredBytes } from './stats';

const kb = (n: number) => `${(n / 1024).toFixed(0)} kB`;

/** Frame rate, draw calls and download size, so the spec's performance targets can be measured. */
export default function Panel() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <aside className="dev-panel mono" aria-label="Performance readout">
      <div>mode {stats.mode || '-'}</div>
      <div>fps {stats.fps.toFixed(0)}</div>
      <div>frame {stats.frameMs.toFixed(1)} ms</div>
      <div>draw calls {stats.calls}</div>
      <div>triangles {stats.triangles}</div>
      <div>
        before corridor {stats.bytesAtReady ? kb(stats.bytesAtReady) : '-'}
        {stats.readyAt ? ` at ${(stats.readyAt / 1000).toFixed(1)} s` : ''}
      </div>
      <div>downloaded now {kb(transferredBytes())}</div>
    </aside>
  );
}
