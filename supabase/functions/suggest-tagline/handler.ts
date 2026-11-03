/** Suggests short "about you" lines from a member's interests. Pure apart from the fetch it is given, so it can be tested. */
export interface Env {
  /** Kept as a backend secret. Never in the repo and never in the site. */
  ANTHROPIC_API_KEY?: string;
}

const MODEL = 'claude-haiku-5-5';
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function buildPrompt(interests: string, name: string): string {
  return [
    `Write three different one-line "about me" taglines for ${name || 'a developer'} on a studio's crew page.`,
    'Each is at most 120 characters, warm, plain and specific, in the first person or neutral, with no emoji and no exclamation marks.',
    'Base them only on this description from the developer. Do not invent facts.',
    `Description: ${interests}`,
    'Reply with exactly three lines and nothing else.',
  ].join('\n');
}

/** Turns the model's reply into up to three clean lines. */
export function parseSuggestions(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["“]|["”]$/g, '').trim())
    .filter((l) => l.length > 0 && l.length <= 160)
    .slice(0, 3);
}

export async function handle(req: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  let body: { interests?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Send JSON.' });
  }
  const interests = typeof body.interests === 'string' ? body.interests.trim().slice(0, 600) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (interests.length < 10) return json(400, { error: 'Tell us a little more about what you enjoy building.' });
  if (!env.ANTHROPIC_API_KEY) return json(503, { error: 'Suggestions are not set up yet. You can write your own.' });

  const res = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: buildPrompt(interests, name) }],
    }),
  });
  if (!res.ok) return json(502, { error: 'The suggestion service did not answer. You can write your own.' });
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? []).map((c) => (c.type === 'text' ? (c.text ?? '') : '')).join('\n');
  const suggestions = parseSuggestions(text);
  return suggestions.length ? json(200, { suggestions }) : json(502, { error: 'No suggestions came back. Try again.' });
}
