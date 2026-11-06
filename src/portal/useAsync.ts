import { useCallback, useEffect, useState } from 'react';

interface Result<T> {
  key: string;
  data?: T;
  error?: string;
}

/** Loads data for a screen. `key` says what the data is for; change it to load again. */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const full = `${key}#${tick}`;

  useEffect(() => {
    let live = true;
    load()
      .then((data) => live && setResult({ key: full, data }))
      .catch(
        (e: unknown) =>
          live &&
          setResult({ key: full, error: e instanceof Error ? e.message : 'Something went wrong.' }),
      );
    return () => {
      live = false;
    };
    // `load` is recreated each render; `key` stands for what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = result && result.key === full ? result : null;
  // A reload of the same data keeps the last result on screen, so saving something does not blank the page,
  // replay its entrance animations or lose the reader's place. Only new data (a different key) shows loading.
  const stale =
    !current && result && result.key.startsWith(`${key}#`) && result.data !== undefined
      ? result
      : null;
  const shown = current ?? stale;
  return {
    data: shown?.data,
    error: current?.error ?? null,
    loading: shown === null,
    refreshing: stale !== null,
    reload,
  };
}

/** Turns a Supabase result into data or a thrown, readable error. */
export async function must<T>(
  p: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}
