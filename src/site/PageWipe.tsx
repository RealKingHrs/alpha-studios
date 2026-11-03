import { motion } from 'motion/react';
const BANDS = ['midnight', 'midnight-2', 'midnight', 'midnight-2', 'midnight'] as const;

export type WipePhase = 'idle' | 'cover' | 'reveal';

/** Five midnight bands that sweep up over the old page and away from the new one. */
export function PageWipe({ phase }: { phase: WipePhase }) {
  return (
    <div className="wipe" aria-hidden="true">
      {BANDS.map((c, i) => (
        <motion.div
          key={i}
          className="wipe-band"
          style={{ left: `${i * 20}%`, background: `var(--${c})` }}
          initial={false}
          animate={{ y: phase === 'cover' ? '0%' : phase === 'reveal' ? '-101%' : '101%' }}
          transition={
            phase === 'idle'
              ? { duration: 0 }
              : { duration: 0.42, ease: [0.76, 0, 0.24, 1], delay: i * 0.035 }
          }
        />
      ))}
    </div>
  );
}
