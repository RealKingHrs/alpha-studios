import type { Snapshot } from '../content/schema';
import { propRender } from './renders';
import { earn } from './achievementStore';
import { Sticker } from './Mark';
import { Magnetic } from './motion/Magnetic';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';
import { Reveal } from './Reveal';

const PLAN = [
  [
    'Pitch it',
    'Sign in and tell us the idea, who it is for and what you are stuck on. Five minutes, no deck.',
  ],
  ['We read every one', 'The whole crew reads it. You get a reply either way, with notes.'],
  ['The team votes', 'If it makes us want to build it, we say yes.'],
  [
    'We coin it',
    'We adopt it as an Alpha Studios project and bring resources: people, tooling, launch help and, where we can, funding.',
  ],
  [
    'Your name stays',
    'You are the founder, permanently. Keep building it with us, or hand it over and move on.',
  ],
] as const;

const WANTED = [
  ['Funding', 3],
  ['Backend and infrastructure', 5],
  ['Interface and design', 4],
  ['App Store and launch', 4],
  ['Mentoring', 5],
] as const;

const Stars = ({ n }: { n: number }) => (
  <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <i key={i} className={i <= n ? 'on' : ''} />
    ))}
  </span>
);

/** Where indie and solo developers pitch projects to the studio. */
export function LaunchpadPage({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  const adopted = snap.projects.filter((p) => p.origin === 'launchpad');
  return (
    <>
      <section className="s-hello s-hello--page a-tomato lp-hero" aria-labelledby="pt">
        <div className="s-wrap">
          <Sticker text="OPEN DOOR" className="s-hello-sticker" />
          <p className="s-eyebrow mono">Launchpad</p>
          <h1 id="pt" className="display s-hello-title">
            <SplitText text="Got an idea that needs a crew?" />
          </h1>
          <p className="s-lede">
            Alpha Studios builds backends, websites and apps. Launchpad is the open door for indie
            and solo developers: pitch what you are making, and if the team believes in it, we adopt
            it, back it with resources and credit you as its founder, for good.
          </p>
          <p className="lp-props" aria-hidden="true">
            {(['phone', 'laptop', 'browser'] as const).map((k) => (
              <img
                key={k}
                src={propRender(link, k)}
                alt=""
                width="120"
                height="120"
                loading="lazy"
                decoding="async"
              />
            ))}
          </p>
          <p className="s-actions">
            <Magnetic>
              <a
                className="s-btn s-btn--ink"
                href={link('/portal/app/#/pitch')}
                data-cursor="Pitch"
                onClick={() => earn('pitch-ready')}
              >
                Pitch your project
              </a>
            </Magnetic>
          </p>
        </div>
      </section>

      <section className="lp-plan" aria-labelledby="plan-title">
        <div className="s-wrap">
          <Reveal>
            <p className="s-eyebrow mono">The process</p>
            <h2 id="plan-title" className="display">
              The Plan
            </h2>
          </Reveal>
          <ol className="plan">
            {PLAN.map(([t, d], i) => (
              <li key={t}>
                <span className="plan-n display" aria-hidden="true">
                  {i + 1}
                </span>
                <strong>{t}</strong>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-wanted" aria-labelledby="wanted-title">
        <div className="s-wrap">
          <Reveal>
            <p className="s-eyebrow mono">What we bring</p>
            <h2 id="wanted-title" className="display">
              The board
            </h2>
            <p className="s-lede">
              How much of each we can put behind a project depends on the project. These are the
              things we are best at.
            </p>
          </Reveal>
          <ul className="board">
            {WANTED.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <Stars n={n} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-adopted" aria-labelledby="adopted-title">
        <div className="s-wrap">
          <h2 id="adopted-title" className="display">
            Adopted projects
          </h2>
          {adopted.length === 0 ? (
            <p className="s-lede">The first adopted project will land here. It could be yours.</p>
          ) : (
            <ul className="adopted">
              {adopted.map((p) => (
                <li key={p.slug}>
                  <a href={link(`/projects/${p.slug}/`)}>
                    <strong>{p.name}</strong>
                    <span className="mono">Founded by {p.founderName}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="lp-terms" aria-labelledby="terms-title">
        <div className="s-wrap">
          <h2 id="terms-title" className="display">
            The fine print, in plain words
          </h2>
          <p className="s-lede">
            An adopted project is owned and supported by Alpha Studios. The founder&apos;s name and
            credit on it are permanent and cannot be removed from the studio&apos;s own tools. The
            details of ownership, support and what each side does are agreed in writing with each
            founder before anything is adopted. Pitching costs nothing and commits nobody.
          </p>
        </div>
      </section>
    </>
  );
}
