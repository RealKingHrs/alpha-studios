/** Starts the publish workflow when the backend reports a content change. Pure, so it can be tested. */
export interface Env {
  /** Shared secret the database webhook sends in the x-webhook-secret header. */
  WEBHOOK_SECRET?: string;
  /** "owner/repo" of the site. */
  GITHUB_REPO?: string;
  /** A token allowed to create repository dispatch events. Kept as a secret, never in the repo. */
  GITHUB_DISPATCH_TOKEN?: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function handle(req: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  if (!env.WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== env.WEBHOOK_SECRET) {
    return json(401, { error: 'Not allowed' });
  }
  if (!env.GITHUB_REPO || !env.GITHUB_DISPATCH_TOKEN) return json(500, { error: 'Not configured' });

  // Many edits in a row start many requests. The workflow's concurrency group keeps one running and
  // one waiting, so a burst of dispatches becomes at most two builds.
  const res = await fetchFn(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
      'user-agent': 'alpha-studios-publish-trigger',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'publish' }),
  });
  return res.ok ? json(202, { started: true }) : json(502, { error: `GitHub answered ${res.status}` });
}
