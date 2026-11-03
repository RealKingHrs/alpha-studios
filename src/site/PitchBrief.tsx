import { useState } from 'react';
import { CopyButton } from './fx/CopyButton';
import { Note } from './fx/Doodles';
import { Magnetic } from './motion/Magnetic';

const HELP = ['Funding', 'An API', 'Front end', 'Design', 'Launch help', 'Mentoring'] as const;
const PLATFORMS = ['iOS', 'macOS', 'Android', 'Web', 'AI and ML', 'Not sure yet'] as const;
const STAGE = [
  'Just an idea',
  'Sketches or a prototype',
  'Half built',
  'Live, needs a boost',
] as const;

export interface Pitch {
  name: string;
  email: string;
  idea: string;
  about: string;
  help: string[];
  platforms: string[];
  stage: string;
  links: string;
}

/** The text of the email a visitor sends. Pure, so it can be tested without a browser. */
export function pitchText(f: Pitch) {
  return [
    `Hello Alpha Studios,`,
    ``,
    `I would like to pitch an idea to Launchpad.`,
    ``,
    `Idea name: ${f.idea || '(not filled in)'}`,
    `What it is: ${f.about || '(not filled in)'}`,
    `Stage: ${f.stage || 'Just an idea'}`,
    `Platforms: ${f.platforms.join(', ') || 'Not sure yet'}`,
    `Help I would like: ${f.help.join(', ') || 'Not sure yet'}`,
    `Links: ${f.links || 'None yet'}`,
    ``,
    `${f.name || 'Me'}`,
    `${f.email || ''}`,
  ].join('\n');
}

/**
 * The Launchpad pitch form. It writes an email in the visitor's own mail app, so the public site never talks to a
 * server and nobody is asked to sign in. The crew reads the idea in the portal once the admin logs it.
 */
export function PitchBrief({ to }: { to?: string }) {
  const [f, setF] = useState<Pitch>({
    name: '',
    email: '',
    idea: '',
    about: '',
    help: [],
    platforms: [],
    stage: '',
    links: '',
  });
  const text = pitchText(f);
  const href = to
    ? `mailto:${to}?subject=${encodeURIComponent('Launchpad pitch' + (f.idea ? `: ${f.idea}` : ''))}&body=${encodeURIComponent(text)}`
    : undefined;
  const toggle = (key: 'help' | 'platforms', v: string) =>
    setF((s) => ({
      ...s,
      [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v],
    }));
  return (
    <section
      id="pitch"
      data-section
      className="s-section s-brief a-sun"
      aria-labelledby="pitch-title"
    >
      <div className="s-wrap s-brief-grid">
        <div>
          <p className="s-eyebrow mono">
            <span className="s-num">04</span> Pitch your idea
          </p>
          <h2 id="pitch-title" className="display">
            Tell us what you are building.
          </h2>
          <Note className="s-brief-note">start here</Note>
          <p className="s-lede">
            Fill this in and it opens as an email to the crew. It stays on your device until you
            press send, and you do not need to sign in.
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
            <span className="mono">What is your idea called?</span>
            <input value={f.idea} onChange={(e) => setF({ ...f, idea: e.target.value })} />
          </label>
          <label className="s-brief-wide">
            <span className="mono">What is it, and who is it for?</span>
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
                  onClick={() => toggle('platforms', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="s-brief-wide">
            <legend className="mono">Help you would like</legend>
            <div className="s-brief-chips">
              {HELP.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={f.help.includes(p)}
                  onClick={() => toggle('help', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="s-brief-wide">
            <legend className="mono">How far along is it?</legend>
            <div className="s-brief-chips">
              {STAGE.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={f.stage === p}
                  onClick={() => setF((s) => ({ ...s, stage: s.stage === p ? '' : p }))}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="s-brief-wide">
            <span className="mono">Links (a repo, a design, a site)</span>
            <input value={f.links} onChange={(e) => setF({ ...f, links: e.target.value })} />
          </label>
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
            <CopyButton text={text} label="Copy the pitch" />
          </p>
        </form>
      </div>
    </section>
  );
}
