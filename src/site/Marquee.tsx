/** A band of words sliding past on an accent colour. The copy that repeats it is hidden from assistive tech. */
export function Marquee({
  items,
  accent = 'sun',
  label,
}: {
  items: string[];
  accent?: string;
  label: string;
}) {
  if (items.length === 0) return null;
  const row = (hidden: boolean) => (
    <ul className="marquee-row" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={`${t}-${i}`}>
          {t}
          <span aria-hidden="true"> ✺ </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section className={`marquee a-${accent}`} aria-label={label}>
      <div className="marquee-track">
        {row(false)}
        {row(true)}
        {row(true)}
      </div>
    </section>
  );
}
