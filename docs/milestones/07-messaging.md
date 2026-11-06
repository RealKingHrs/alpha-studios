# Milestone 7: Messaging

## Goal

Crew talk to each other inside the portal, privately and live: direct messages, one channel per project, and a crew room.

## Read first

`docs/SPEC.md` section 7a (who can read what, oversight) and section 8 (security).

## Decisions (settled 7 November 2026)

- Admin oversight of direct messages: off by default, silent switch, audited, with a permanent notice to crew.
- Messages are plain text, not end-to-end encrypted.
- No replies, reactions, pins, files or notifications in this milestone.

## Tasks

- Migration `20261105000000_messaging.sql`: conversations, members of direct threads, messages, read marks, member status, oversight flag, `app.can_read_conversation`, `public.start_dm`, `public.set_oversight`, rate limit, grants, Realtime publication.
- Portal Messages screen: conversation list with unread counts, thread, composer, status line, presence, oversight switch for the admin, standing privacy line.
- Hash routes with a second segment (`#/messages/<id>`).
- Role tests in `tests/rls/messaging.test.ts`; unit tests in `tests/messaging.test.ts`; a guard that the snapshot code never reads workspace tables.
- Docs: RUNBOOK, IDEAS, CLAUDE.md rule.

## Done when

- Two signed-in members exchange messages live; a third member and a visitor cannot read them.
- The admin cannot read direct messages until oversight is on, can read them (read-only) when it is on, and each switch is in the audit log.
- Project channels follow project membership; a paused member sees nothing.
- Unread counts and the status line work; presence shows who is online.
- Lint, types, format, unit tests and role tests pass; the layout works at 375 px and with `?motion=reduce`.

## Kickoff prompt

"Read docs/SPEC.md and docs/milestones/07-messaging.md. Enter plan mode and propose a short plan before writing code."
