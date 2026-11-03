// Supabase Edge Function (Deno). Callers must be signed in: the platform checks the login token before this runs.
// Set the key with: npx supabase secrets set ANTHROPIC_API_KEY=... (see docs/RUNBOOK.md).
import { handle } from './handler.ts';

Deno.serve((req) => handle(req, { ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') }));
