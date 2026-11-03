import { describe, expect, it, vi } from 'vitest';
import {
  buildPrompt,
  handle,
  parseSuggestions,
} from '../supabase/functions/suggest-tagline/handler';

const post = (body: unknown) =>
  new Request('http://fn.test/', { method: 'POST', body: JSON.stringify(body) });

describe('suggest tagline', () => {
  it('puts the description and name in the prompt', () => {
    const p = buildPrompt('I love building small iOS apps', 'Ada');
    expect(p).toContain('Ada');
    expect(p).toContain('I love building small iOS apps');
  });

  it('cleans bullets, numbers and quotes and keeps three lines', () => {
    expect(
      parseSuggestions(
        '1. "Builds calm apps"\n- Loves tidy backends\n• Ships on Fridays\n4. extra',
      ),
    ).toEqual(['Builds calm apps', 'Loves tidy backends', 'Ships on Fridays']);
  });

  it('asks for more detail when the description is too short and never calls the model', async () => {
    const f = vi.fn();
    const res = await handle(
      post({ interests: 'code' }),
      { ANTHROPIC_API_KEY: 'k' },
      f as unknown as typeof fetch,
    );
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('says it is not set up when there is no key', async () => {
    const f = vi.fn();
    const res = await handle(
      post({ interests: 'I enjoy building web apps' }),
      {},
      f as unknown as typeof fetch,
    );
    expect(res.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it('returns suggestions from the model and sends the key only to the model', async () => {
    const f = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'One\nTwo\nThree' }] }), {
        status: 200,
      }),
    );
    const res = await handle(
      post({ interests: 'I enjoy building web apps', name: 'Ada' }),
      { ANTHROPIC_API_KEY: 'k' },
      f as unknown as typeof fetch,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: ['One', 'Two', 'Three'] });
    expect(f.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
    expect(f.mock.calls[0][1].headers['x-api-key']).toBe('k');
  });

  it('reports a failing model politely', async () => {
    const f = vi.fn().mockResolvedValue(new Response('no', { status: 500 }));
    const res = await handle(
      post({ interests: 'I enjoy building web apps' }),
      { ANTHROPIC_API_KEY: 'k' },
      f as unknown as typeof fetch,
    );
    expect(res.status).toBe(502);
  });
});
