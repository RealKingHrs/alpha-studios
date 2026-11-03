import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Snapshot } from '../../content/schema';
import { statusLabel } from '../../rooms';
import { useMotionOn } from '../motion/context';

/** The masthead's issue line: it cycles through what the studio is shipping, from the real projects. */
export function Ticker({ snap }: { snap: Snapshot }) {
  const on = useMotionOn();
  const lines = [
    'Issue 01 · Made at twenty · Nov 2026',
    ...snap.projects
      .slice()
      .reverse()
      .map((p) => `Shipping: ${p.name}, ${statusLabel[p.status].toLowerCase()}`),
    `${snap.members.length} builders · ${snap.projects.length} drops · all aged twenty`,
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on || lines.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), 3800);
    return () => clearInterval(id);
  }, [on, lines.length]);
  if (!on)
    return (
      <p className="s-issue mono" aria-hidden="true">
        {lines[0]}
      </p>
    );
  return (
    <p className="s-issue mono" aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lines[i]}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {lines[i]}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}
