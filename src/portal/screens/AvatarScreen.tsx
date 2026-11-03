import { useMemo } from 'react';
import { SupabaseAvatarStore } from '../../avatar/supabaseStore';
import { Builder } from '../avatar/Builder';
import { supabase } from '../supabase';
import type { MemberRow } from '../types';

export function AvatarScreen({ me }: { me: MemberRow }) {
  const store = useMemo(() => new SupabaseAvatarStore(supabase!, me.id), [me.id]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <>
      <h1>My avatar</h1>
      <Builder store={store} reduce={reduce} />
    </>
  );
}
