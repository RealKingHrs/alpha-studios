import { createClient } from '@supabase/supabase-js';

/**
 * The portal is the only code that talks to the backend. The project address and the public (anon)
 * key are safe to ship because every table is protected by row-level security. No other key belongs here.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url!, key!) : null;
