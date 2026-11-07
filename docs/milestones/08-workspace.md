# Milestone 8: Workspace

## Goal

Crew plan and track project work inside the portal: a task board, notes, a shared calendar, an activity feed and search.

## Read first

`docs/SPEC.md` section 7a (milestone 8) and section 8.

## Tasks

- Migration `20261106000000_workspace.sql`: tasks, project notes, events, activity, `app.can_work_on`, guards and activity triggers, `public.search_workspace`, grants, Realtime publication.
- Portal screens: Board, Notes, Calendar, Activity, Search; Home panels; Board, Notes and Channel links on project cards; sidebar search box.
- Pure helpers in `src/portal/workspace.ts` with unit tests.
- Role tests in `tests/rls/workspace.test.ts`; extend the privacy guard in `tests/messaging.test.ts`.

## Done when

- A project member adds a task, moves it across the columns and sees each step in the feed; someone not on the project sees none of it.
- Notes can be written and edited by project members only.
- The calendar shows events and task due dates; only the admin can add crew-wide events.
- Search returns only what the person may read.
- A paused member and a visitor see nothing.
- Lint, types, format, unit tests and role tests pass; the layout works at 375 px and with `?motion=reduce`.

## Kickoff prompt

"Read docs/SPEC.md and docs/milestones/08-workspace.md. Enter plan mode and propose a short plan before writing code."
