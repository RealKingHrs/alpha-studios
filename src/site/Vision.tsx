import { CraftIcon, CreditIcon, PeopleIcon } from './Icons';
import { Reveal } from './Reveal';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';

/** What the studio stands for. Short, direct and written to be edited: these are the studio's words, not decoration. */
export const PRINCIPLES = [
  {
    icon: CraftIcon,
    title: 'Craft over speed',
    text: 'We take the time to get the details right, so what we ship keeps working long after launch day.',
  },
  {
    icon: PeopleIcon,
    title: 'People over metrics',
    text: 'Every product starts with a person who needs something done. We design for them, not for a dashboard.',
  },
  {
    icon: CreditIcon,
    title: 'Credit where it is due',
    text: 'The people who make things are named, and stay named. That is why Launchpad founders keep their credit for good.',
  },
] as const;

/** The vision on the home page: one statement card and three principles, laid out as a bento on the golden split. */
export function Vision({ link }: { link: LinkFn }) {
  return (
    <section id="vision" data-section className="s-section s-vision" aria-labelledby="vision-title">
      <div className="s-wrap">
        <Reveal>
          <p className="s-eyebrow mono">
            <span className="s-num">00</span> Our vision
          </p>
        </Reveal>
        <div className="s-bento">
          <div className="s-bento-card s-bento-lead" data-spot>
            <h2 id="vision-title" className="display s-vision-title">
              <SplitText text="Good software is built with care, shipped with honesty and open to the next generation of builders." />
            </h2>
            <a className="s-link" href={link('/about/')}>
              Read the origin story <span aria-hidden="true">→</span>
            </a>
          </div>
          <ul className="s-principles">
            {PRINCIPLES.map((p, i) => (
              <li
                key={p.title}
                className={`s-bento-card a-${['tomato', 'mint', 'sky'][i]}`}
                data-spot
              >
                <Reveal delay={i * 60}>
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
      </div>
    </section>
  );
}
