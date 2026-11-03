import { describe, expect, it, vi } from 'vitest';
import { handle } from '../supabase/functions/publish-trigger/handler';

const env = { WEBHOOK_SECRET: 's3', GITHUB_REPO: 'alpha/site', GITHUB_DISPATCH_TOKEN: 'tok' };
const req = (headers: Record<string, string> = {}, method = 'POST') =>
  new Request('http://fn.test/', { method, headers });

describe('publish trigger', () => {
  it('starts the workflow with the secret token and the publish event', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const res = await handle(req({ 'x-webhook-secret': 's3' }), env, f as unknown as typeof fetch);
    expect(res.status).toBe(202);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/alpha/site/dispatches');
    expect(init.headers.authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ event_type: 'publish' });
  });

  it('refuses callers without the shared secret and never calls GitHub', async () => {
    const f = vi.fn();
    const cases: Record<string, string>[] = [{}, { 'x-webhook-secret': 'wrong' }];
    for (const headers of cases) {
      expect((await handle(req(headers), env, f as unknown as typeof fetch)).status).toBe(401);
    }
    expect(
      (
        await handle(
          req({ 'x-webhook-secret': 'anything' }),
          { ...env, WEBHOOK_SECRET: undefined },
          f as unknown as typeof fetch,
        )
      ).status,
    ).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('only accepts POST, reports missing config, and passes GitHub failures on', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    expect((await handle(req({}, 'GET'), env, f as unknown as typeof fetch)).status).toBe(405);
    expect(
      (
        await handle(
          req({ 'x-webhook-secret': 's3' }),
          { ...env, GITHUB_DISPATCH_TOKEN: undefined },
          f as unknown as typeof fetch,
        )
      ).status,
    ).toBe(500);
    expect(
      (await handle(req({ 'x-webhook-secret': 's3' }), env, f as unknown as typeof fetch)).status,
    ).toBe(502);
  });

  it('never puts the token in a response body', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const res = await handle(req({ 'x-webhook-secret': 's3' }), env, f as unknown as typeof fetch);
    expect(await res.text()).not.toContain('tok');
  });
});
