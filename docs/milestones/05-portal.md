# Milestone 5: Portal

## Goal

A separate dashboard where the admin runs the studio and crew run their own profiles, with invite codes, an audit trail and a publish trigger.

## Read first

`CLAUDE.md`, `docs/SPEC.md` sections 7 and 8.

## Decisions needed from the user before coding

- Crew edits live with an audit log (proposed) or a review queue.

## Tasks

- [ ] Build the portal at its own address with the brand, and a discreet crew login link on the vault.
- [ ] Sign-in with GitHub, plus email and password if the user wants it. Link the login to the member record.
- [ ] Invite redemption in server-side logic: codes hashed, single-use, expiring, rate-limited. A wrong or expired code never creates an account.
- [ ] Admin screens: crew list and editor, invite codes (issue, revoke, reissue), project list and editor (create, edit, delete), site settings.
- [ ] Crew screens: my profile with bio and links to GitHub, LinkedIn, YouTube, Snapchat and Instagram; the avatar builder; join and leave projects; edit details of own projects.
- [ ] Audit log screen showing who changed what and when, with a revert action for the admin.
- [ ] Publish trigger: after a change, the backend starts the publish job (for example through a database webhook calling a small function that starts the workflow with a token kept as a secret). Keep the scheduled run as fallback.
- [ ] Extend the permission tests from milestone 1 to cover every screen's actions.
- [ ] Designed loading, empty, error and offline states. Accessible forms with labels and visible focus.
- [ ] Member consent: joining includes agreeing that name, role, bio and links are public. The admin can remove a profile.

## Done when

- The admin can issue an invite code and a member can redeem it and land on their profile.
- Crew can edit their profile and join or leave projects, and cannot do anything outside the permissions table.
- Only the admin can add or delete projects.
- The audit log shows changes and the admin can revert one.
- A change published in the portal appears on the public site after the publish job runs, without any public page calling the backend.
- All permission tests pass.

## Out of scope

Sound, cursor effects, analytics.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/05-portal.md. Milestones 1 to 4 are done. Enter plan mode. Propose a plan for milestone 5: the screens, how invite redemption works server-side, how the publish trigger starts the workflow, and how you will verify each "Done when" line, including the permission tests. List the decisions you need from me first. Do not write code until I approve the plan.
```
