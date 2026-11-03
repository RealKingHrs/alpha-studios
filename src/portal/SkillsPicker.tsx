import { useState } from 'react';

export interface Skill {
  name: string;
  level: number;
}

const SUGGESTED = [
  'React',
  'TypeScript',
  'Swift',
  'SwiftUI',
  'Kotlin',
  'Python',
  'Node',
  'Postgres',
  'Design',
  'Testing',
  'DevOps',
  'Rust',
];
const MAX = 12;

/** Pick skills from a list or add your own, then rate each from 1 to 5. Every control works from the keyboard. */
export function SkillsPicker({
  value,
  onChange,
}: {
  value: Skill[];
  onChange: (v: Skill[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const has = (n: string) => value.some((s) => s.name.toLowerCase() === n.toLowerCase());
  const add = (raw: string) => {
    const name = raw.trim().slice(0, 30);
    if (!name || has(name) || value.length >= MAX) return;
    onChange([...value, { name, level: 3 }]);
    setDraft('');
  };
  const rate = (name: string, level: number) =>
    onChange(value.map((s) => (s.name === name ? { ...s, level } : s)));

  return (
    <fieldset className="skills-picker">
      <legend>Skills</legend>
      <p className="hint">
        Add what you work with, then press the dots to rate yourself from 1 to 5. Up to {MAX}.
      </p>
      <ul className="skill-chips" aria-label="Your skills">
        {value.map((s) => (
          <li key={s.name} className="skill-chip">
            <span className="skill-name">{s.name}</span>
            <span role="radiogroup" aria-label={`${s.name} rating`} className="skill-dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={s.level === n}
                  aria-label={`${n} out of 5`}
                  className={n <= s.level ? 'on' : ''}
                  onClick={() => rate(s.name, n)}
                />
              ))}
            </span>
            <button
              type="button"
              className="skill-remove"
              aria-label={`Remove ${s.name}`}
              onClick={() => onChange(value.filter((x) => x.name !== s.name))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="skill-suggest" aria-label="Suggested skills">
        {SUGGESTED.filter((n) => !has(n)).map((n) => (
          <button key={n} type="button" className="secondary" onClick={() => add(n)}>
            + {n}
          </button>
        ))}
      </div>
      <div className="skill-add">
        <label htmlFor="skill-own">Add your own</label>
        <input
          id="skill-own"
          value={draft}
          maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <button type="button" className="secondary" onClick={() => add(draft)}>
          Add skill
        </button>
      </div>
    </fieldset>
  );
}
