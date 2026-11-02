import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Keys come from the local stack at run time; nothing is hardcoded or committed.
const env = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
export const url: string = env.API_URL;
const anonKey: string = env.ANON_KEY;
const serviceKey: string = env.SERVICE_ROLE_KEY;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const service = createClient(url, serviceKey, opts);
export const visitor = createClient(url, anonKey, opts);

export const run = Math.random().toString(36).slice(2, 8);

/** Create an auth user and return a client signed in as that user. */
export async function signedIn(label: string): Promise<{ client: SupabaseClient; userId: string }> {
  const email = `${label}-${run}@example.test`;
  const password = `pw-${run}-${label}-Aa1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(url, anonKey, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, userId: data.user.id };
}

export async function must<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}
