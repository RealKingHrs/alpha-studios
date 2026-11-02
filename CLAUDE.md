# Alpha Studios site

A premium portfolio for Alpha Studios, a studio that builds native iOS and macOS apps, web apps and more. Visitors fly through a dark, explorable 3D "vault" to see two projects and five crew members. Crew and one admin manage content through a separate portal.

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
4. Every address also serves real HTML with the text, links, title and a share image. The 3D scene is an enhancement on top.
5. Respect reduced motion. Provide a lite mode, and switch to it automatically when frame rate drops under 30 for two seconds.
6. Real photos of members are never uploaded or stored. Avatars are saved as small versioned records of chosen options.
7. Use the tokens in `design/tokens.css`. Do not hardcode colours, spacing or durations.
8. Gold budget: at most one gold element per view, except admin-only controls in the portal. Gold and emerald never share an element.
9. Sound is off by default and starts only after the visitor interacts. The intro is silent.
10. Copy is sentence case, plain and specific. No emoji, no filler, no exclamation marks in system text.

## Proposed stack (confirm in the milestone 1 plan)

- Frontend: TypeScript, Vite, React, Three.js through React Three Fiber, deployed as static files to GitHub Pages.
- Backend: Supabase (Postgres with row-level security, Auth with GitHub sign-in, Storage). Firebase is the alternative if the user chooses it.
- Publish job: a GitHub Actions workflow that reads approved content and GitHub repo details, writes `content.json`, rebuilds the site, and pings the backend so a free project stays active. It runs on each publish and daily.
- Fonts: Inter and JetBrains Mono, self-hosted.

## Where things live

- `docs/SPEC.md`: the full spec.
- `docs/milestones/`: six build steps, each with tasks, "Done when", and a kickoff prompt.
- `design/tokens.css`: colour, type, spacing and motion tokens.
- `assets/logo/`: the Alpha mark, ink version, lockup and brand board.
- `content/CONTENT-TEMPLATE.md`: the words and images the user must supply.

## Commands

Fill this in during milestone 1 and keep it current: install, dev server, build, test, lint, publish job dry run.
