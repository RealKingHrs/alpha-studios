import { motion, useInView } from 'motion/react';
import { useRef, type ElementType } from 'react';
import { useMotionOn } from './context';
import { splitWords, staggerDelay } from './helpers';

/**
 * Words rise out of a mask one after another when the heading scrolls into view. Without motion it is just
 * the text. With motion, the real sentence stays in the page for assistive tech and the animated copy is hidden.
 */
export function SplitText({
  text,
  as: Tag = 'span',
  className = '',
  delay = 0,
  step = 0.07,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  step?: number;
}) {
  const on = useMotionOn();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  if (!on) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag ref={ref} className={`sw ${className}`.trim()}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true" className="sw-line">
        {splitWords(text).map((w, i) => (
          <span key={`${w}-${i}`}>
            <span className="sw-mask">
              <motion.span
                className="sw-word"
                initial={{ y: '40%', opacity: 0, filter: 'blur(10px)' }}
                animate={seen ? { y: '0%', opacity: 1, filter: 'blur(0px)' } : undefined}
                transition={{
                  duration: 0.62,
                  ease: [0.22, 1, 0.36, 1],
                  delay: delay + staggerDelay(i, step),
                }}
              >
                {w}
              </motion.span>
            </span>{' '}
          </span>
        ))}
      </span>
    </Tag>
  );
}
