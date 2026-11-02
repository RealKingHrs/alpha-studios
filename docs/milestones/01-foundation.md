# Milestone 1: Foundation

## Goal

A deployed, empty site that loads from a content snapshot, with the backend, roles and publish job working underneath it.

## Read first

`CLAUDE.md`, `docs/SPEC.md` sections 4, 7 and 8, `design/tokens.css`.

## Decisions needed from the user before coding

- Supabase (recommended) or Firebase.
- A free hosting address or a custom domain.
- Confirm the proposed stack in `CLAUDE.md`.

## Tasks

- [ ] Set up the project: TypeScript, Vite, React, lint, format, tests. Self-host Inter and JetBrains Mono. Import `design/tokens.css`.
- [ ] Deploy to GitHub Pages with a GitHub Actions workflow. Make direct links to nested addresses work, either with a fallback page or pre-built pages.
- [ ] Create the backend project. Build the schema for members, projects, project membership, invites, site settings, repo cache and audit log (see spec section 8).
- [ ] Write row-level security rules for visitor, crew and admin exactly as in the spec's permissions table. The audit log is writable by the system only.
- [ ] Turn on GitHub sign-in. Create the single admin once, directly in the backend, with two-factor authentication on the admin's account. Write the recovery path into `docs/RUNBOOK.md`.
- [ ] Define the snapshot schema as a typed contract. Seed placeholder content (two projects, five members) so later steps have data.
- [ ] Build the publish job as a GitHub Actions workflow: read approved content and GitHub repo details, write `content.json`, rebuild and deploy, and send the backend a request so a free project stays active. Run on manual trigger and daily, plus a scheduled fallback so a missed trigger heals.
- [ ] Make the empty site read `content.json` only and render every address as readable HTML.
- [ ] Create a bolder, simplified favicon and tab icon from `assets/logo/alpha-mark.svg` (the thin strokes vanish under 20 px). Export the sizes browsers and app icons need.
- [ ] List every secret and where it is stored in `docs/RUNBOOK.md`. Confirm nothing secret is committed.
- [ ] Write automated tests that sign in as visitor, crew and admin and prove each can and cannot do what the permissions table says.
- [ ] Fill in the Commands section of `CLAUDE.md`.

## Done when

- The repo, free hosting and backend are set up and the site is live at its address.
- The admin can sign in.
- Database rules enforce the three roles, proved by tests.
- The publish job builds a snapshot and the empty site loads from it, with no backend call from public pages.
- Direct links to nested addresses work on the host.
- The bolder favicon cut exists and is used.
- `docs/RUNBOOK.md` records secrets, the recovery path and how to resume a paused backend.

## Out of scope

The 3D scene, avatars, the portal screens and invite redemption.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/01-foundation.md. Enter plan mode. Propose a plan for milestone 1: the services and files you will create, the order, and how you will verify each "Done when" line. List every decision you need from me first. Do not write code until I approve the plan.
```
