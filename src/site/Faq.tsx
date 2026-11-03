import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Reveal } from './Reveal';
import { SplitText } from './motion/SplitText';
import { useMotionOn } from './motion/context';

/** Questions people ask before working with a studio. First-draft answers for the studio to edit. */
export const FAQ = [
  [
    'What do you build?',
    'Native iOS and macOS apps, web apps, AI and ML features, and the APIs behind them.',
  ],
  [
    'How long does a project take?',
    'A focused first version usually takes six to twelve weeks. We agree the scope and dates in writing before we start.',
  ],
  [
    'Who owns the code and the product?',
    'You do. We hand over the repository, the accounts and the documentation when we finish.',
  ],
  [
    'Can we start small?',
    'Yes. Many projects begin with a short discovery week, so you know what you are buying before you commit.',
  ],
  [
    'How do we talk about price?',
    'Send the brief below. We reply with a clear range and what drives it, and never surprise you later.',
  ],
  [
    'Do you work with early-stage founders?',
    'Gladly. If you are a young builder with an idea, start with Launchpad and keep your name on it.',
  ],
  [
    'What happens after launch?',
    'We stay on for fixes and improvements, and hand over a runbook so your team can take it from there.',
  ],
  [
    'Who will I talk to?',
    'A real person from the crew, usually the one building your product. No account managers in between.',
  ],
] as const;

/** An accordion: each answer opens with a spring-driven height. Buttons, not links, and keyboard friendly. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const on = useMotionOn();
  return (
    <section id="faq" data-section className="s-section s-faq" aria-labelledby="faq-title">
      <div className="s-wrap s-faq-grid">
        <div>
          <Reveal>
            <p className="s-eyebrow mono">
              <span className="s-num">07</span> Questions
            </p>
          </Reveal>
          <h2 id="faq-title" className="display">
            <SplitText text="Good questions." />
          </h2>
          <p className="s-lede">Not here? Send the brief and ask anything.</p>
        </div>
        <ul className="s-faq-list">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <li key={q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{q}</span>
                    <i aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {(isOpen || !on) && (
                    <motion.div
                      id={`faq-${i}`}
                      role="region"
                      hidden={!isOpen}
                      className="s-faq-a"
                      initial={on ? { height: 0, opacity: 0 } : false}
                      animate={on ? { height: 'auto', opacity: 1 } : undefined}
                      exit={on ? { height: 0, opacity: 0 } : undefined}
                      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    >
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
