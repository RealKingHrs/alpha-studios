// Supabase Edge Function (Deno). Wire it to a database webhook; see docs/RUNBOOK.md.
import { handle } from './handler.ts';

Deno.serve((req) =>
  handle(req, {
    WEBHOOK_SECRET: Deno.env.get('WEBHOOK_SECRET'),
    GITHUB_REPO: Deno.env.get('GITHUB_REPO'),
    GITHUB_DISPATCH_TOKEN: Deno.env.get('GITHUB_DISPATCH_TOKEN'),
  }),
);
