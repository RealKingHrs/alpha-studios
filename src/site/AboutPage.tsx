import type { Snapshot } from '../content/schema';
import { Counters } from './Counters';
import { Magnetic } from './motion/Magnetic';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';
import { Reveal } from './Reveal';
import { PRINCIPLES } from './Vision';

const TOWARDS = [
  'Apps that people keep on their home screen because they are calm, fast and honest.',
  'A studio where a young builder can bring an idea, get real support, and keep their name on it.',
  'A body of work and a crew that others can learn from.',
] as const;

/** Why the studio exists, what it believes and what it is building towards. First draft of the words. */
export function AboutPage({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  return (
    <>
      <section className="s-about-hero a-sky" aria-labelledby="pt">
        <div className="s-wrap">
          <p className="s-eyebrow mono">About Alpha Studios</p>
          <h1 id="pt" className="display s-about-title">
            <SplitText text="We exist to build things that last, with people who are just getting started." />
          </h1>
          <p className="s-lede">{snap.settings.studioStatement}</p>
        </div>
      </section>

      <section className="s-section" aria-labelledby="believe-title">
        <div className="s-wrap">
          <Reveal>
            <p className="s-eyebrow mono">What we believe</p>
            <h2 id="believe-title" className="display">
              Three principles we do not trade away
            </h2>
          </Reveal>
          <ul className="s-principles s-principles--long">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="s-bento-card">
                <Reveal delay={i * 80}>
                  <span className="s-principle-icon">
                    <p.icon />
                  </span>
                  <span className="s-principle-n mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Counters snap={snap} />

      <section className="s-section" aria-labelledby="towards-title">
        <div className="s-wrap s-towards">
          <Reveal>
            <p className="s-eyebrow mono">Where we are headed</p>
            <h2 id="towards-title" className="display">
              What we are building towards
            </h2>
          </Reveal>
          <ol>
            {TOWARDS.map((t, i) => (
              <li key={t}>
                <Reveal delay={i * 80}>
                  <span className="s-principle-n mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p>{t}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="s-about-cta a-tomato" aria-labelledby="cta-title">
        <div className="s-wrap">
          <h2 id="cta-title" className="display">
            Have an idea that deserves to exist?
          </h2>
          <p className="s-actions">
            <Magnetic>
              <a className="s-btn s-btn--ink" href={link('/launchpad/')}>
                Bring it to Launchpad
              </a>
            </Magnetic>
            <Magnetic>
              <a className="s-btn s-btn--line" href={link('/contact/')}>
                Talk to us
              </a>
            </Magnetic>
          </p>
        </div>
      </section>
    </>
  );
}
