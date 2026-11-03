/** A decorative barcode made from a word: each letter sets the width of one bar. Always the same for the same word. */
export function Barcode({ code = 'ALPHA-ISSUE-01' }: { code?: string }) {
  let x = 0;
  const bars = [...code].flatMap((ch, i) => {
    const w = 1 + (ch.charCodeAt(0) % 4);
    const bar = i % 2 === 0 ? { x, w } : null;
    x += w + 1;
    return bar ? [bar] : [];
  });
  return (
    <svg
      className="fx-barcode"
      viewBox={`0 0 ${x} 24`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="24" />
      ))}
    </svg>
  );
}
