# Alpha Studios: Claude Code starter package

This folder is everything Claude Code needs to build the Alpha Studios site, following the Plan, Refine, Implement method. The plan and refine stages are written down; this package starts the implement stage.

## What is inside

| Path | What it is |
| --- | --- |
| `CLAUDE.md` | Project memory that Claude Code reads every session: rules, workflow, stack, where things live |
| `docs/SPEC.md` | The full spec, version 0.2 final draft |
| `docs/milestones/` | Six build steps, each with tasks, a "Done when" list and a kickoff prompt |
| `design/tokens.css` | Colour, type, spacing and motion tokens |
| `assets/logo/` | The Alpha mark, ink version, lockup and brand board |
| `content/CONTENT-TEMPLATE.md` | The words and images you need to supply |

## Before you start

1. Make accounts: GitHub (free) and Supabase (free). Install Node.js (current LTS) and Claude Code.
2. Settle the decisions that step 1 needs. Claude Code will ask, but it helps to have thought about them: Supabase or Firebase, and a free hosting address or a custom domain.
3. Check the trademark risk for the alpha mark (see `docs/SPEC.md` section 3). You can do this in parallel with building, but it must be done before launch.

## How to start

1. Create a new public repository on GitHub, for example `alpha-studios`. The repo is public, so never put a secret in it.
2. Copy everything in this folder into the repository root and commit it.
3. Open a terminal in the repository and start Claude Code.
4. Ask it to plan first. Most versions let you switch into plan mode with Shift+Tab; if yours differs, simply tell it not to write code until you approve its plan.
5. Paste the kickoff prompt from `docs/milestones/01-foundation.md`.
6. Read its plan. Push back on anything unclear. Approve only when you could explain the plan to someone else.

## How to work each milestone

- One milestone at a time, in order. One branch and one pull request per milestone.
- Before approving a plan, check that it names how each "Done when" line will be verified.
- Before merging, run the "Done when" list yourself. If a line is not true, it is not done.
- After each milestone, update the Commands section in `CLAUDE.md` and tell Claude Code which milestone is next.
- If you change your mind about a decision, change `docs/SPEC.md` first, then tell Claude Code. The spec is the source of truth.

## What is not in this package

- A bolder favicon cut (milestone 1 makes it).
- Real content and screenshots (use `content/CONTENT-TEMPLATE.md`).
- Avatar art (milestone 4 builds it, by the route you choose).
- Sound files (milestone 6).
- A trademark search for the name and the mark.
