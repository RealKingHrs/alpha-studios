import { describe, expect, it, vi } from 'vitest';
import { cleanPin, isPin, PIN_ALPHABET, turnWheel } from '../src/ui/pin';
import { handle, hashIp, maskEmail, type Deps } from '../supabase/functions/portal-pin/handler';

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://fn.test/', { method: 'POST', body: JSON.stringify(body), headers });

function deps(over: Partial<Deps> = {}): Deps {
  return {
    pinFind: vi.fn(async () => ({ found: true, member: 'm1', email: 'dustmail20@gmail.com' })),
    ensureUser: vi.fn(async () => {}),
    sendOtp: vi.fn(async () => ({})),
    verifyOtp: vi.fn(async () => ({
      userId: 'u1',
      session: { access_token: 'a', refresh_token: 'r' },
    })),
    link: vi.fn(async () => 'hari-rudran-sunil'),
    otpFailures: vi.fn(async () => 0),
    recordOtpFailure: vi.fn(async () => {}),
    ...over,
  };
}

describe('the PIN helpers', () => {
  it('has 32 characters with no look-alikes, so five wheels give about 33 million PINs', () => {
    expect(PIN_ALPHABET).toHaveLength(32);
    expect(PIN_ALPHABET).not.toMatch(/[IO01]/);
    expect(32 ** 5).toBe(33_554_432);
  });

  it('cleans what a person types and recognises a whole PIN', () => {
    expect(cleanPin('ab-c d2e3x')).toBe('ABCD2');
    expect(cleanPin('IIOO0')).toBe('');
    expect(isPin('ABCD2')).toBe(true);
    expect(isPin('ABCDI')).toBe(false);
    expect(isPin('ABC')).toBe(false);
  });

  it('turns a wheel one step either way and wraps round', () => {
    expect(turnWheel('A', 1)).toBe('B');
    expect(turnWheel('A', -1)).toBe('9');
    expect(turnWheel('9', 1)).toBe('A');
    expect(turnWheel('H', 1)).toBe('J');
  });
});

describe('maskEmail', () => {
  it('shows the first letter and the domain only', () => {
    expect(maskEmail('dustmail20@gmail.com')).toBe('d•••••••@gmail.com');
    expect(maskEmail('a@b.co')).toBe('a••@b.co');
  });
});

describe('portal-pin, start', () => {
  it('emails a code for a right PIN and answers with a masked address only', async () => {
    const d = deps();
    const res = await handle(post({ action: 'start', pin: 'abcd2' }), d);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, hint: 'd•••••••@gmail.com' });
    expect(JSON.stringify(body)).not.toContain('dustmail20');
    expect(d.ensureUser).toHaveBeenCalledWith('dustmail20@gmail.com');
    expect(d.sendOtp).toHaveBeenCalledWith('dustmail20@gmail.com');
  });

  it('says only that the PIN is not recognised, and sends nothing', async () => {
    const d = deps({ pinFind: vi.fn(async () => ({ found: false })) });
    const res = await handle(post({ action: 'start', pin: 'ZZZZZ' }), d);
    expect(res.status).toBe(401);
    expect(d.sendOtp).not.toHaveBeenCalled();
  });

  it('is locked after too many tries', async () => {
    const d = deps({ pinFind: vi.fn(async () => ({ locked: true })) });
    expect((await handle(post({ action: 'start', pin: 'ABCD2' }), d)).status).toBe(429);
    expect(d.sendOtp).not.toHaveBeenCalled();
  });

  it('rejects a short PIN, bad JSON, other methods and unknown actions', async () => {
    expect((await handle(post({ action: 'start', pin: 'AB' }), deps())).status).toBe(400);
    expect(
      (await handle(new Request('http://fn.test/', { method: 'POST', body: '{' }), deps())).status,
    ).toBe(400);
    expect((await handle(new Request('http://fn.test/'), deps())).status).toBe(405);
    expect((await handle(post({ action: 'nope', pin: 'ABCD2' }), deps())).status).toBe(400);
  });

  it('answers the browser preflight, since the portal calls it from another origin', async () => {
    const res = await handle(new Request('http://fn.test/', { method: 'OPTIONS' }), deps());
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('reports a failed email send without leaking why', async () => {
    const d = deps({ sendOtp: vi.fn(async () => ({ error: 'smtp password wrong' })) });
    const res = await handle(post({ action: 'start', pin: 'ABCD2' }), d);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('smtp');
  });
});

describe('portal-pin, verify', () => {
  it('links the login and returns a session for a right code', async () => {
    const d = deps();
    const res = await handle(post({ action: 'verify', pin: 'ABCD2', token: '123 456' }), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      session: { access_token: 'a', refresh_token: 'r' },
      member: 'hari-rudran-sunil',
    });
    expect(d.verifyOtp).toHaveBeenCalledWith('dustmail20@gmail.com', '123456');
    expect(d.link).toHaveBeenCalledWith('m1', 'u1');
  });

  it('counts a wrong code, gives no session, and stops after five', async () => {
    const wrong = deps({ verifyOtp: vi.fn(async () => ({ error: 'Token has expired' })) });
    const res = await handle(post({ action: 'verify', pin: 'ABCD2', token: '000000' }), wrong);
    expect(res.status).toBe(401);
    expect(wrong.recordOtpFailure).toHaveBeenCalledWith('m1');
    expect(wrong.link).not.toHaveBeenCalled();

    const tired = deps({ otpFailures: vi.fn(async () => 5) });
    const stop = await handle(post({ action: 'verify', pin: 'ABCD2', token: '123456' }), tired);
    expect(stop.status).toBe(429);
    expect(tired.verifyOtp).not.toHaveBeenCalled();
  });

  it('refuses a login that cannot take the seat', async () => {
    const d = deps({ link: vi.fn(async () => null) });
    const res = await handle(post({ action: 'verify', pin: 'ABCD2', token: '123456' }), d);
    expect(res.status).toBe(403);
  });

  it('needs the full code', async () => {
    const res = await handle(post({ action: 'verify', pin: 'ABCD2', token: '12' }), deps());
    expect(res.status).toBe(400);
  });
});

describe('the caller fingerprint', () => {
  it('is stable, salted and never the address itself', async () => {
    const a = await hashIp('203.0.113.9', 's');
    expect(a).toBe(await hashIp('203.0.113.9', 's'));
    expect(a).not.toBe(await hashIp('203.0.113.9', 'other'));
    expect(a).not.toContain('203');
    expect(a).toHaveLength(64);
  });
});
