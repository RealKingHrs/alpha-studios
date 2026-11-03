import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import type { MemberRow } from './types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Signed in, but no profile is linked yet: the person needs to enter an invite code. */
  | { status: 'no-profile'; email: string }
  | { status: 'ready'; me: MemberRow };

interface AuthApi {
  state: AuthState;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
};

async function stateFor(session: Session | null): Promise<AuthState> {
  if (!session || !supabase) return { status: 'signed-out' };
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data
    ? { status: 'ready', me: data as MemberRow }
    : { status: 'no-profile', email: session.user.email ?? 'your login' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    try {
      setState(await stateFor(data.session));
      setFailure(null);
    } catch (e) {
      setFailure((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    // Loading the first session from the backend; state is set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setState({ status: 'signed-out' });
  }, []);

  const value = useMemo(() => ({ state, refresh, signOut }), [state, refresh, signOut]);
  if (failure) {
    return (
      <div role="alert" className="state error-state">
        <p>Could not load your profile: {failure}</p>
        <button type="button" className="secondary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
