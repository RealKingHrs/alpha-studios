import type { Snapshot } from '../content/schema';
import { GlobeIcon, LaptopIcon, PhoneIcon, PlugIcon, SparkIcon } from './Icons';
import { Note } from './fx/Doodles';
import { Reveal } from './Reveal';
import { SplitText } from './motion/SplitText';
import type { LinkFn } from './parts';

/** What the studio makes. The promises are first-draft words for the studio to edit. */
const SERVICES = [
  {
    key: 'ios',
    title: 'Native iOS apps',
    text: 'Fast, calm apps in Swift that feel at home on the phone, from first sketch to the App Store.',
    icon: PhoneIcon,
    accent: 'tomato',
    uses: (p: Snapshot['projects'][number]) => p.platforms.includes('ios'),
  },
  {
    key: 'macos',
    title: 'macOS apps',
    text: 'Menu bar tools and desktop apps that use the Mac the way Apple intended.',
    icon: LaptopIcon,
    accent: 'sun',
    uses: (p: Snapshot['projects'][number]) => p.platforms.includes('macos'),
  },
  {
    key: 'web',
    title: 'Web apps',
    text: 'Quick, accessible web products that work on any device and load before you blink.',
    icon: GlobeIcon,
    accent: 'mint',
    uses: (p: Snapshot['projects'][number]) => p.platforms.includes('web'),
  },
  {
    key: 'ai',
    title: 'AI and ML',
    text: 'Models that earn their place in the product: trained, measured and shipped, not demoed.',
    icon: SparkIcon,
    accent: 'lilac',
    uses: (p: Snapshot['projects'][number]) =>
      p.tech.some((t) => /pytorch|tensorflow|ml|ai|model|vision/i.test(t)),
  },
  {
    key: 'api',
    title: 'APIs',
    text: 'Clean, documented endpoints and the services behind them, built to be relied on.',
    icon: PlugIcon,
    accent: 'sky',
    uses: (p: Snapshot['projects'][number]) =>
      p.tech.some((t) => /fastapi|express|node|django|flask|graphql|rest|api/i.test(t)),
  },
] as const;

/** What we make: five cards, each with an icon that moves on hover and the drops that use it. */
export function Services({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  return (
    <section id="make" data-section className="s-section s-make" aria-labelledby="make-title">
      <div className="s-wrap">
        <Reveal>
          <p className="s-eyebrow mono">
            <span className="s-num">02</span> What we make
          </p>
        </Reveal>
        <h2 id="make-title" className="display s-make-title">
          <SplitText text="Five things we do well." />
        </h2>
        <Note className="s-make-note">the five</Note>
        <ul className="s-make-grid">
          {SERVICES.map((s, i) => {
            const used = snap.projects.filter(s.uses);
            return (
              <li key={s.key} className={`s-make-card a-${s.accent}`} data-spot>
                <Reveal delay={i * 60}>
                  <span className="s-make-icon">
                    <s.icon />
                  </span>
                  <span className="s-make-n mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {used.length > 0 && (
                    <p className="s-make-used mono">
                      Seen in{' '}
                      {used.map((p, k) => (
                        <span key={p.slug}>
                          {k > 0 && ', '}
                          <a href={link(`/projects/${p.slug}/`)}>{p.name}</a>
                        </span>
                      ))}
                    </p>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
