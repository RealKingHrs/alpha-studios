import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useMotionOn } from '../motion/context';

/**
 * Cycles through a few endings in place. The first word is the real one: it is what the server renders and what
 * reduced motion keeps. An invisible copy of the longest word holds the width, so nothing around it jumps.
 */
export function WordLoop({ words, every = 2800 }: { words: readonly string[]; every?: number }) {
  const on = useMotionOn();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on || words.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(id);
  }, [on, words.length, every]);
  if (!on) return <span className="fx-loop">{words[0]}</span>;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
  return (
    <span className="fx-loop">
      <span className="fx-loop-ghost">{longest}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[i]}
          className="fx-loop-word"
          initial={{ y: '70%', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-70%', opacity: 0, filter: 'blur(8px)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
