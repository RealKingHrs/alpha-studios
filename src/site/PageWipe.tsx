import { motion } from 'motion/react';
import { ACCENTS } from './data';

export type WipePhase = 'idle' | 'cover' | 'reveal';

/** Five coloured bands that sweep up over the old page and away from the new one. */
export function PageWipe({ phase }: { phase: WipePhase }) {
  return (
    <div className="wipe" aria-hidden="true">
      {ACCENTS.map((c, i) => (
        <motion.div
          key={c}
          className="wipe-band"
          style={{ left: `${i * 20}%`, background: `var(--${c})` }}
          initial={false}
          animate={{ y: phase === 'cover' ? '0%' : phase === 'reveal' ? '-101%' : '101%' }}
          transition={
            phase === 'idle'
              ? { duration: 0 }
              : { duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: i * 0.045 }
          }
        />
      ))}
    </div>
  );
}
