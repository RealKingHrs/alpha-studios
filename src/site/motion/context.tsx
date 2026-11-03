import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

const Ctx = createContext(false);

/** True when animation is allowed: after hydration, and only if the visitor has not turned it off. */
export const useMotionOn = () => useContext(Ctx);
export const MotionProvider = ({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) => <Ctx.Provider value={enabled}>{children}</Ctx.Provider>;

/** Runs before the browser paints on the client, and as a plain effect where there is no browser. */
export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** True at tablet width and above. False on the server and until the first check. */
export function useWide(min = 900) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = matchMedia(`(min-width: ${min}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [min]);
  return wide;
}
