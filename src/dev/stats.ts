/** Numbers the dev panel shows. Written by the scene only when ?dev is on. */
export const stats = {
  fps: 0,
  frameMs: 0,
  calls: 0,
  triangles: 0,
  mode: '',
  /** Bytes transferred by the time the corridor first rendered. */
  bytesAtReady: 0,
  /** performance.now() when the first frame rendered. */
  readyAt: 0,
};

export function transferredBytes(): number {
  const nav = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  // encodedBodySize is the size on the wire even when the browser served the file from cache,
  // so repeat loads still give a cold-load figure. It is as served: this preview does not compress.
  const size = (e: PerformanceResourceTiming | PerformanceNavigationTiming) =>
    e.encodedBodySize || e.transferSize || 0;
  return [...nav, ...res].reduce((n, e) => n + size(e), 0);
}
