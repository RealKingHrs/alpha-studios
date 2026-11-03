// Supabase Edge Function (Deno). Public: it checks a PIN itself, so the platform's login check is switched off in
// supabase/config.toml. It needs no secret of its own: SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
// are provided to every function by the platform. Optional: IP_SALT (any long random string).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handle, type Deps } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, opts);
const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, opts);

const deps: Deps = {
  async pinFind(pin, ipHash) {
    const { data, error } = await service.rpc('pin_find', { p_pin: pin, p_ip_hash: ipHash });
    if (error) throw error;
    return data as never;
  },
  async ensureUser(email) {
    // New logins are created here, never by visitors, so "Allow new users to sign up" can stay off.
    const { error } = await service.auth.admin.createUser({ email, email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) throw error;
  },
  async sendOtp(email) {
    const { error } = await anon.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    return error ? { error: error.message } : {};
  },
  async verifyOtp(email, token) {
    const { data, error } = await anon.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.session || !data.user) return { error: error?.message ?? 'No session' };
    return {
      userId: data.user.id,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    };
  },
  async link(member, userId) {
    const { data, error } = await service.rpc('pin_link', { p_member: member, p_user: userId });
    if (error) throw error;
    return (data as string | null) ?? null;
  },
  async otpFailures(member) {
    const { count } = await service
      .from('pin_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', `otp:${member}`)
      .eq('ok', false)
      .gte('at', new Date(Date.now() - 15 * 60_000).toISOString());
    return count ?? 0;
  },
  async recordOtpFailure(member) {
    await service.from('pin_attempts').insert({ ip_hash: `otp:${member}`, ok: false });
  },
};

Deno.serve((req) => handle(req, deps, Deno.env.get('IP_SALT') ?? ''));
