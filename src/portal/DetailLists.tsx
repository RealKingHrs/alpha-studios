import { useId } from 'react';

export interface Experience {
  title: string;
  org: string;
  from: string;
  to: string;
  note: string;
}
export interface Education {
  school: string;
  field: string;
  from: string;
  to: string;
}

/** Comma-separated words, kept as a clean list. Empty entries and extra spaces are dropped. */
export const toList = (text: string, max: number) =>
  text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);

function Row({
  legend,
  children,
  onRemove,
}: {
  legend: string;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <fieldset className="detail-row">
      <legend>{legend}</legend>
      <div className="detail-grid">{children}</div>
      <button type="button" className="secondary" onClick={onRemove}>
        Remove {legend}
      </button>
    </fieldset>
  );
}

function Input({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Add, edit and remove the places someone has worked. Up to 8, newest first by convention. */
export function ExperienceEditor({
  value,
  onChange,
}: {
  value: Experience[];
  onChange: (v: Experience[]) => void;
}) {
  const set = (i: number, patch: Partial<Experience>) =>
    onChange(value.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <fieldset className="detail-list">
      <legend>Experience</legend>
      <p className="hint">
        Roles you have had, newest first. Say it the way you would to a friend.
      </p>
      {value.map((e, i) => (
        <Row
          key={i}
          legend={`role ${i + 1}`}
          onRemove={() => onChange(value.filter((_, k) => k !== i))}
        >
          <Input
            label="What you did"
            value={e.title}
            onChange={(v) => set(i, { title: v })}
            max={80}
          />
          <Input label="Where" value={e.org} onChange={(v) => set(i, { org: v })} max={80} />
          <Input
            label="From"
            value={e.from}
            onChange={(v) => set(i, { from: v })}
            max={12}
            placeholder="2022"
          />
          <Input
            label="To"
            value={e.to}
            onChange={(v) => set(i, { to: v })}
            max={12}
            placeholder="Now"
          />
          <Input
            label="One line about it"
            value={e.note}
            onChange={(v) => set(i, { note: v })}
            max={160}
          />
        </Row>
      ))}
      {value.length < 8 && (
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([...value, { title: '', org: '', from: '', to: '', note: '' }])}
        >
          Add a role
        </button>
      )}
    </fieldset>
  );
}

/** Add, edit and remove studies. Up to 6. */
export function EducationEditor({
  value,
  onChange,
}: {
  value: Education[];
  onChange: (v: Education[]) => void;
}) {
  const set = (i: number, patch: Partial<Education>) =>
    onChange(value.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <fieldset className="detail-list">
      <legend>Education</legend>
      {value.map((e, i) => (
        <Row
          key={i}
          legend={`study ${i + 1}`}
          onRemove={() => onChange(value.filter((_, k) => k !== i))}
        >
          <Input
            label="School or course"
            value={e.school}
            onChange={(v) => set(i, { school: v })}
            max={80}
          />
          <Input
            label="What you studied"
            value={e.field}
            onChange={(v) => set(i, { field: v })}
            max={80}
          />
          <Input
            label="From"
            value={e.from}
            onChange={(v) => set(i, { from: v })}
            max={12}
            placeholder="2018"
          />
          <Input
            label="To"
            value={e.to}
            onChange={(v) => set(i, { to: v })}
            max={12}
            placeholder="2022"
          />
        </Row>
      ))}
      {value.length < 6 && (
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([...value, { school: '', field: '', from: '', to: '' }])}
        >
          Add a study
        </button>
      )}
    </fieldset>
  );
}
