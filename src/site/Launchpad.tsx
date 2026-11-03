import type { Snapshot } from '../content/schema';
import { Aurora } from './fx/Aurora';
import { Marquee } from './Marquee';
import { Magnetic } from './motion/Magnetic';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';
import { Reveal } from './Reveal';

const BRING = [
  'An app idea',
  'A game',
  'A backend',
  'A website',
  'A half-finished project',
  'A big dream',
];

const WHO = [
  [
    'a-sun',
    'Still studying',
    'You build on weekends and between classes. Your idea does not need to wait for a job title.',
  ],
  [
    'a-mint',
    'Building solo',
    'You have been carrying a project alone. It is more fun with a crew behind you.',
  ],
  [
    'a-lilac',
    'Just starting out',
    'You have an idea and no idea where to begin. That is a perfectly good place to be.',
  ],
] as const;

const GET = [
  [
    'a-sky',
    'People in your corner',
    'A crew that has built things and wants to see yours come alive.',
  ],
  [
    'a-tomato',
    'Someone to learn from',
    'Honest feedback and a bit of mentoring when you get stuck.',
  ],
  ['a-sun', 'A real launch', 'Help getting your work in front of the people it was made for.'],
] as const;

const FAQ = [
  [
    'Do I need to be experienced?',
    'No. If you can describe the idea, you can pitch it. Every builder starts somewhere.',
  ],
  ['Does it cost anything?', 'Pitching is free, and so is hearing back from us.'],
  [
    'What if my idea is only half finished?',
    'Perfect. Half finished is what most great things look like early on.',
  ],
  ['Will it still be mine?', 'Your name stays on it as its founder, always.'],
] as const;

/** Where newcomers pitch an idea. Warm, bright and encouraging. It says nothing of how the studio decides. */
export function LaunchpadPage({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  const adopted = snap.projects.filter((p) => p.origin === 'launchpad');
  const pitch = link('/portal/app/#/pitch');
  return (
    <>
      <section className="lp-hero" data-spot aria-labelledby="pt">
        <Aurora />
        <div className="s-wrap lp-hero-grid">
          <div>
            <p className="s-eyebrow mono">Launchpad</p>
            <h1 id="pt" className="display lp-title">
              <SplitText text="Bring us your idea." />
              <span className="lp-title-accent">
                <SplitText text="Keep your name on it." delay={0.35} />
              </span>
            </h1>
            <Reveal delay={150}>
              <p className="s-lede">
                Launchpad is how young builders get real support. Pitch what you are making, and if
                the crew believes in it, Alpha Studios adopts it, backs it, and credits you as its
                founder for good.
              </p>
              <p className="s-actions">
                <Magnetic>
                  <a className="s-btn s-btn--ink" href={pitch}>
                    Pitch your idea
                  </a>
                </Magnetic>
                <Magnetic>
                  <a className="s-btn s-btn--line" href={link('/about/')}>
                    Why we do this
                  </a>
                </Magnetic>
              </p>
            </Reveal>
          </div>
          <div className="lp-hero-art" aria-hidden="true">
            <div className="lp-orbit">
              <i className="lp-ring lp-ring--1" />
              <i className="lp-ring lp-ring--2" />
              <span className="lp-node lp-node--1 a-sun">
                <b className="mono">01</b> Pitch
              </span>
              <span className="lp-node lp-node--2 a-mint">
                <b className="mono">02</b> Adopt
              </span>
              <span className="lp-node lp-node--3 a-lilac">
                <b className="mono">03</b> Credit
              </span>
            </div>
            <div className="lp-credit fx-shine">
              <p className="mono lp-credit-k">Project</p>
              <p className="display lp-credit-t">Your idea</p>
              <ul>
                <li>
                  <span className="mono">Founded by</span>
                  <strong>You</strong>
                </li>
                <li>
                  <span className="mono">Backed by</span>
                  <strong>Alpha Studios</strong>
                </li>
              </ul>
              <span className="lp-credit-seal mono">Credit kept for good</span>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={BRING} accent="tomato" label="Things people bring to Launchpad" />

      <section className="lp-section" aria-labelledby="who-title">
        <div className="s-wrap">
          <Reveal>
            <p className="s-eyebrow mono">Who it is for</p>
            <h2 id="who-title" className="display">
              Made for people who make things
            </h2>
          </Reveal>
          <ul className="lp-cards">
            {WHO.map(([accent, title, text], i) => (
              <li key={title}>
                <Reveal delay={i * 120}>
                  <div className={`lp-card ${accent}`} data-spot>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-section lp-section--alt" aria-labelledby="get-title">
        <div className="s-wrap">
          <Reveal>
            <p className="s-eyebrow mono">What you could get</p>
            <h2 id="get-title" className="display">
              A little help goes a long way
            </h2>
          </Reveal>
          <ul className="lp-cards">
            {GET.map(([accent, title, text], i) => (
              <li key={title}>
                <Reveal delay={i * 120}>
                  <div className={`lp-card ${accent}`}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="next-title">
        <div className="s-wrap">
          <Reveal>
            <h2 id="next-title" className="display">
              Your idea could be next
            </h2>
          </Reveal>
          {adopted.length === 0 ? (
            <Reveal delay={120}>
              <div className="lp-empty">
                <span className="lp-empty-plus display" aria-hidden="true">
                  +
                </span>
                <p>This spot is saved for the first Launchpad project. Maybe yours.</p>
              </div>
            </Reveal>
          ) : (
            <ul className="lp-adopted">
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

      <section className="lp-section lp-section--alt" aria-labelledby="faq-title">
        <div className="s-wrap lp-faq">
          <Reveal>
            <h2 id="faq-title" className="display">
              Good questions
            </h2>
          </Reveal>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final" aria-labelledby="final-title">
        <Aurora />
        <div className="s-wrap">
          <h2 id="final-title" className="display">
            <SplitText text="Ready when you are." />
          </h2>
          <p className="s-actions">
            <Magnetic>
              <a className="s-btn s-btn--ink" href={pitch}>
                Pitch your idea
              </a>
            </Magnetic>
          </p>
        </div>
      </section>
    </>
  );
}
