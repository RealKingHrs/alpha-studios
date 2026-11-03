/**
 * Sign-in by personal PIN, then a one-time code emailed to the registered address.
 *   { action: 'start',  pin }          -> checks the PIN, emails a code, answers with a masked address
 *   { action: 'verify', pin, token }   -> checks the PIN and the code, links the login, answers with a session
 * Everything that touches data goes through `Deps`, so the rules here can be tested without a database.
 * The member's email is never sent to the browser, only a masked hint.
 */
export interface FindResult {
  locked?: boolean;
  found?: boolean;
  member?: string;
  email?: string;
}

export interface Deps {
  pinFind(pin: string, ipHash: string): Promise<FindResult>;
  ensureUser(email: string): Promise<void>;
  sendOtp(email: string): Promise<{ error?: string }>;
  verifyOtp(
    email: string,
    token: string,
  ): Promise<{ userId?: string; session?: { access_token: string; refresh_token: string }; error?: string }>;
  link(member: string, userId: string): Promise<string | null>;
  otpFailures(member: string): Promise<number>;
  recordOtpFailure(member: string): Promise<void>;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

const MAX_OTP_FAILURES = 5;

/** d•••••••@gmail.com: enough to recognise your own address, not enough to learn someone else's. */
export function maskEmail(email: string): string {
  const [name, domain = ''] = email.split('@');
  const head = name.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(2, Math.min(7, name.length - 1)))}@${domain}`;
}

const cleanPin = (v: unknown) =>
  typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) : '';
const cleanToken = (v: unknown) => (typeof v === 'string' ? v.replace(/\D/g, '').slice(0, 8) : '');

/** A short, one-way fingerprint of the caller, so the database can rate limit without storing an address. */
export async function hashIp(ip: string, salt = ''): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function callerIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

export async function handle(req: Request, deps: Deps, salt = ''): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  let body: { action?: unknown; pin?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Send JSON.' });
  }
  const pin = cleanPin(body.pin);
  if (pin.length !== 5) return json(400, { error: 'A PIN has five characters.' });

  const found = await deps.pinFind(pin, await hashIp(callerIp(req), salt));
  if (found.locked) return json(429, { error: 'Too many tries. Wait fifteen minutes and try again.' });
  if (!found.found || !found.member || !found.email)
    return json(401, { error: 'That PIN is not recognised.' });

  if (body.action === 'start') {
    await deps.ensureUser(found.email);
    const sent = await deps.sendOtp(found.email);
    if (sent.error) return json(502, { error: 'The code could not be sent. Try again in a minute.' });
    return json(200, { ok: true, hint: maskEmail(found.email) });
  }

  if (body.action === 'verify') {
    const token = cleanToken(body.token);
    if (token.length < 6) return json(400, { error: 'Enter the six-digit code from your email.' });
    if ((await deps.otpFailures(found.member)) >= MAX_OTP_FAILURES)
      return json(429, { error: 'Too many wrong codes. Wait fifteen minutes and start again.' });
    const checked = await deps.verifyOtp(found.email, token);
    if (checked.error || !checked.session || !checked.userId) {
      await deps.recordOtpFailure(found.member);
      return json(401, { error: 'That code is wrong or has expired.' });
    }
    const slug = await deps.link(found.member, checked.userId);
    if (!slug)
      return json(403, { error: 'This login cannot be linked to that profile. Ask the admin to reissue your access.' });
    return json(200, { ok: true, session: checked.session, member: slug });
  }

  return json(400, { error: 'Unknown action.' });
}
