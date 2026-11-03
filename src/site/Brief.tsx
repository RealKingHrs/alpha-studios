import { useState } from 'react';
import { Magnetic } from './motion/Magnetic';
import { CopyButton } from './fx/CopyButton';

const PLATFORMS = ['iOS', 'macOS', 'Web', 'AI and ML', 'APIs', 'Not sure yet'] as const;
const RANGES = ['Under 2k', '2k to 10k', '10k to 30k', '30k and up', 'Let us talk'] as const;
const WHEN = ['This month', 'In 1 to 3 months', 'Later this year', 'Just exploring'] as const;

/** The text of the email a visitor sends. Pure, so it can be tested without a browser. */
export function briefText(f: {
  name: string;
  email: string;
  about: string;
  platforms: string[];
  range: string;
  when: string;
}) {
  return [
    `Hello Alpha Studios,`,
    ``,
    `I would like to talk about a project.`,
    ``,
    `What I am building: ${f.about || '(not filled in)'}`,
    `Platforms: ${f.platforms.join(', ') || 'Not sure yet'}`,
    `Budget range: ${f.range || 'Let us talk'}`,
    `Timing: ${f.when || 'Just exploring'}`,
    ``,
    `${f.name || 'Me'}`,
    `${f.email || ''}`,
  ].join('\n');
}

/** A small brief builder. It writes an email in the visitor's own mail app; nothing is sent to any server. */
export function Brief({ to }: { to?: string }) {
  const [f, setF] = useState({
    name: '',
    email: '',
    about: '',
    platforms: [] as string[],
    range: '',
    when: '',
  });
  const text = briefText(f);
  const href = to
    ? `mailto:${to}?subject=${encodeURIComponent('Project brief' + (f.name ? ` from ${f.name}` : ''))}&body=${encodeURIComponent(text)}`
    : undefined;
  const toggle = (p: string) =>
    setF((s) => ({
      ...s,
      platforms: s.platforms.includes(p) ? s.platforms.filter((x) => x !== p) : [...s.platforms, p],
    }));
  const pick = (key: 'range' | 'when', v: string) =>
    setF((s) => ({ ...s, [key]: s[key] === v ? '' : v }));
  return (
    <section
      id="brief"
      data-section
      className="s-section s-brief a-sun"
      aria-labelledby="brief-title"
    >
      <div className="s-wrap s-brief-grid">
        <div>
          <p className="s-eyebrow mono">
            <span className="s-num">08</span> Project brief
          </p>
          <h2 id="brief-title" className="display">
            Tell us what you are building.
          </h2>
          <p className="s-lede">
            Fill this in and it opens as an email to the crew. It stays on your device until you
            press send.
          </p>
        </div>
        <form className="s-brief-form" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span className="mono">Your name</span>
            <input
              value={f.name}
              autoComplete="name"
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </label>
          <label>
            <span className="mono">Your email</span>
            <input
              type="email"
              value={f.email}
              autoComplete="email"
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </label>
          <label className="s-brief-wide">
            <span className="mono">What are you building?</span>
            <textarea
              rows={4}
              value={f.about}
              onChange={(e) => setF({ ...f, about: e.target.value })}
            />
          </label>
          <fieldset className="s-brief-wide">
            <legend className="mono">Platforms</legend>
            <div className="s-brief-chips">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={f.platforms.includes(p)}
                  onClick={() => toggle(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mono">Budget range</legend>
            <div className="s-brief-chips">
              {RANGES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={f.range === p}
                  onClick={() => pick('range', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mono">When</legend>
            <div className="s-brief-chips">
              {WHEN.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={f.when === p}
                  onClick={() => pick('when', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="s-actions s-brief-wide">
            {href ? (
              <Magnetic>
                <a className="s-btn s-btn--ink" href={href}>
                  Open as an email
                </a>
              </Magnetic>
            ) : (
              <span className="s-lede">The studio address is added with the real content.</span>
            )}
            <CopyButton text={text} label="Copy the brief" />
          </p>
        </form>
      </div>
    </section>
  );
}
