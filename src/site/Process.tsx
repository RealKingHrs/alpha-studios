import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Reveal } from './Reveal';
import { SplitText } from './motion/SplitText';
import { useMotionOn } from './motion/context';

const STEPS = [
  [
    'Discover',
    'We learn who it is for and what done looks like, and write it down in plain words.',
  ],
  [
    'Design',
    'Quick sketches, then a clickable prototype you can react to before any code is written.',
  ],
  ['Build', 'Small, tested pieces shipped every week, so you always see real progress.'],
  ['Ship', 'We launch, watch what happens, and stay on to fix and improve what we shipped.'],
] as const;

/** How we build: four steps along a line that draws itself as you scroll. First-draft wording. */
export function Process() {
  const ref = useRef<HTMLElement>(null);
  const on = useMotionOn();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section
      ref={ref}
      id="process"
      data-section
      className="s-section s-process"
      aria-labelledby="process-title"
    >
      <div className="s-wrap">
        <Reveal>
          <p className="s-eyebrow mono">
            <span className="s-num">04</span> How we build
          </p>
        </Reveal>
        <h2 id="process-title" className="display">
          <SplitText text="Four steps, no surprises." />
        </h2>
        <div className="s-process-track">
          <span className="s-process-line" aria-hidden="true">
            <motion.i style={on ? { scaleX: draw } : undefined} />
          </span>
          <ol>
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <Reveal delay={i * 80}>
                  <span className="s-process-n display" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
