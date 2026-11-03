# Alpha Studios site

A premium, serious and welcoming portfolio for Alpha Studios, a studio that builds native iOS and macOS apps, web apps and more. Visitors see two projects and five crew members straight away. The site is richly animated and has no 3D. Crew and one admin manage content through a separate portal.

Read `docs/SPEC.md` before any work. It is the source of truth. If this file and the spec disagree, the spec wins; tell the user and fix the one that is wrong.

## How we work

- Plan, Refine, Implement. The plan and refine stages are done. We are implementing, one milestone at a time, in the order in `docs/milestones/`.
- For every milestone: enter plan mode, read the milestone brief, propose a short plan with the files you will touch and how you will check the result, and wait for approval before writing code.
- Finish a milestone only when every line under its "Done when" is true and demonstrated (run it, test it, show it). Do not start the next milestone on your own.
- Commit small and often with clear messages. One branch per milestone, one pull request per milestone.
- If a decision in the spec is marked "Proposed" and you need it settled, ask the user. Do not silently choose.
- Do not add features, pages or dependencies that the spec does not call for. Put ideas in `docs/IDEAS.md` instead.

## Non-negotiable rules

1. Public pages read only the content snapshot (`content.json`). They never call the backend. The portal alone talks to the backend.
2. Roles (visitor, crew, admin) are enforced by database rules (row-level security), never only by hiding buttons.
3. The repo is public. No secret, token or service key is ever committed. The backend's public key is the only key allowed in client code.
4. Every address also serves real HTML with the text, links, title and a share image. Animation is an enhancement on top.
5. Respect reduced motion everywhere: every animation, smooth scroll and cursor effect switches off, and content is complete without them.
6. Real photos of members are never uploaded or stored. Avatars are saved as small versioned records of chosen options.
7. Use the tokens in `design/tokens.css`. Do not hardcode colours, spacing or durations.
8. Colour: one light paper theme (there is no dark mode); the five accents are flat colour blocks with `--on-accent` ink text, never body text on paper; gold is only the wordmark's full stop, trophies, the hidden cryptex and admin-only portal controls.
9. There is no sound.
10. Copy is sentence case, plain and specific. No emoji, no filler, no exclamation marks in system text.

## Proposed stack (confirm in the milestone 1 plan)

- Frontend: TypeScript, Vite, React, the `motion` animation library and Lenis smooth scrolling, deployed as static files to GitHub Pages.
- Backend: Supabase (Postgres with row-level security, Auth with GitHub sign-in, Storage). Firebase is the alternative if the user chooses it.
- Publish job: a GitHub Actions workflow that reads approved content and GitHub repo details, writes `content.json`, rebuilds the site, and pings the backend so a free project stays active. It runs on each publish and daily.
- Fonts: Fraunces, Inter and JetBrains Mono, self-hosted.

## Where things live

- `docs/SPEC.md`: the full spec.
- `docs/milestones/`: six build steps, each with tasks, "Done when", and a kickoff prompt.
- `design/tokens.css`: colour, type, spacing and motion tokens (golden-ratio type, Fibonacci space, five accents, gold).
- `assets/logo/`: the wordmark lockup, the "a." icon cut (`alpha-a-icon.png`) and the favicon.
- `content/CONTENT-TEMPLATE.md`: the words and images the user must supply.

## Batch 9 notes

- Founder credit is locked in the database and cannot be changed from the app; never add app code that tries.
- Pop-culture nods use wording and mechanics only. No logos, artwork, characters or quotations.

## Version 1

The site is Version 1: bold editorial design, light only, crew portal by PIN and emailed code only. Sign-in is a personal PIN on five wheels then an emailed code (`portal-pin` function); the admin is created with `npm run admin:sql`. To publish it, follow `docs/GO-LIVE.md`; check readiness with `npm run go-live:check`. Never ask for or store a user's passwords or keys; they are entered only on GitHub and Supabase.

## Commands

Run from the repo root. Node 22.

- Install: `npm ci`
- Dev server: `npm run dev` (serves under `/alpha-studios/`; copies the placeholder snapshot if none exists)
- Build and prerender every address: `npm run build` (set `SITE_BASE=/` for a root deploy, `SITE_URL` for share-image links)
- Preview the build: `npm run preview`
- Lint, format check, typecheck: `npm run lint`, `npm run format:check`, `npm run typecheck`
- Unit and build tests: `npm test` (the build tests need `npm run build` first and skip otherwise)
- Role tests (visitor, crew, admin): `npx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,inbucket,mailpit`, then `npm run test:rls`. Needs Docker. `npx supabase db reset` reapplies migrations and seed.
- Publish job dry run: `npm run publish:dry` (seed only, no network). Real run: `npm run publish:snapshot` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.
- Download budget: `npm run sizes` (after a build); `tests/budget.test.ts` fails if the first visit passes 3 MB.
- Regenerate icons from the favicon cut: `npm run icons`. Regenerate `supabase/seed.sql`: `npx tsx scripts/seed-sql.ts`. Placeholder screenshots: `npm run placeholders`.
- Test the calm path with `?motion=reduce` on any address.
- Local portal try-out: `npm run dev:users` (local stack only), then `npm run build` and `npm run preview`, and open `/alpha-studios/portal/app/`.
- Operations, secrets and recovery: `docs/RUNBOOK.md`.
- `npm run content:check`: list placeholder text still in the content.
