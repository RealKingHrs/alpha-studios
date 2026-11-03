import { Reveal } from './Reveal';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';

/** What the studio stands for. Short, direct and written to be edited: these are the studio's words, not decoration. */
export const PRINCIPLES = [
  {
    title: 'Craft over speed',
    text: 'We take the time to get the details right, so what we ship keeps working long after launch day.',
  },
  {
    title: 'People over metrics',
    text: 'Every product starts with a person who needs something done. We design for them, not for a dashboard.',
  },
  {
    title: 'Credit where it is due',
    text: 'The people who make things are named, and stay named. That is why Launchpad founders keep their credit for good.',
  },
] as const;

/** The vision on the home page: one clear statement and three principles. */
export function Vision({ link }: { link: LinkFn }) {
  return (
    <section id="vision" data-section className="s-section s-vision" aria-labelledby="vision-title">
      <div className="s-wrap">
        <Reveal>
          <p className="s-eyebrow mono">
            <span className="s-num">00</span> Our vision
          </p>
        </Reveal>
        <h2 id="vision-title" className="display s-vision-title">
          <SplitText text="Good software is built with care, shipped with honesty and open to the next generation of builders." />
        </h2>
        <ul className="s-principles">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title}>
              <Reveal delay={i * 80}>
                <span className="s-principle-n mono" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="s-vision-more">
          <a className="s-link" href={link('/about/')}>
            Read why we exist <span aria-hidden="true">→</span>
          </a>
        </p>
      </div>
    </section>
  );
}
