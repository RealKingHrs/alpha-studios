import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnreadRow } from './messaging';
import { supabase } from './supabase';

/** Unread counts for the nav and the Messages list. New messages refresh it at once; a timer covers a dropped connection. */
export function useUnread(active: boolean) {
  const [counts, setCounts] = useState<UnreadRow[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!supabase || !active) return;
    const { data } = await supabase.rpc('unread_counts');
    if (Array.isArray(data)) setCounts(data as UnreadRow[]);
  }, [active]);

  useEffect(() => {
    if (!supabase || !active) return;
    const first = setTimeout(() => void refresh(), 0);
    const poll = setInterval(() => void refresh(), 30_000);
    const channel = supabase
      .channel('unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void refresh(), 300);
      })
      .subscribe();
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearTimeout(timer.current);
      void supabase?.removeChannel(channel);
    };
  }, [active, refresh]);

  return { counts, refresh };
}

/** Tells the backend this person is here, so teammates see them as online. Stops while the tab is hidden. */
export function useHeartbeat(active: boolean) {
  useEffect(() => {
    if (!supabase || !active) return;
    const beat = () => {
      if (document.visibilityState === 'visible') void supabase?.rpc('heartbeat');
    };
    beat();
    const every = setInterval(beat, 45_000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(every);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [active]);
}
