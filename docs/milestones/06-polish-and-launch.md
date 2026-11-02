# Milestone 6: Polish and launch

## Goal

The finishing layer that makes it feel premium, the checks that make it safe to share, and the launch.

## Read first

`CLAUDE.md`, `docs/SPEC.md` sections 3, 4, 9 and 10.

## Decisions needed from the user before coding

- Who sources or composes the ambient and interface sounds.
- The result of the trademark search for "Alpha Studios" and the mark.

## Tasks

- [ ] Sound: a low ambient hum, soft interface ticks and a chime on opening a project room. Off by default, with a visible mute toggle. Starts only after the visitor interacts. Files load after the intro.
- [ ] Custom cursor and hover physics: a small cursor that grows over interactive objects, magnetic pull on buttons and pedestals, a slight tilt toward the pointer. Tap ripples on touch.
- [ ] Final intro: draw the real alpha stroke and let the gold spread along the flick.
- [ ] Performance tuning against the targets in spec section 4. Write down measured numbers and any remaining gaps.
- [ ] Accessibility audit: keyboard-only walkthrough, screen reader pass, contrast check, reduced-motion check, labels for sound cues. Fix what you find.
- [ ] Share previews: titles, descriptions and share images for every address. A branded 404 inside the vault.
- [ ] Final app icons and favicon. Convert the wordmark to outlines once the typeface is final.
- [ ] Put in the real content from `content/CONTENT-TEMPLATE.md`: studio statement, five bios, two projects, screenshots.
- [ ] Recheck the free-tier limits in spec section 8 and record the date.
- [ ] Launch checklist in `docs/RUNBOOK.md`: domain if any, secrets confirmed, publish job healthy, backup export taken, trademark search recorded.
- [ ] Publish.

## Done when

- Sound, cursor and hover physics are done and can be switched off.
- Performance targets are met, or the gaps are listed and accepted by the user.
- The accessibility checks pass.
- The trademark search is complete and its outcome is recorded.
- Real content is in and the site is published.

## Out of scope

Full-body avatars, analytics, new projects or crew.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/06-polish-and-launch.md. Milestones 1 to 5 are done. Enter plan mode. Propose a plan for milestone 6: the order of the polish work, how you will measure performance and accessibility, and the launch checklist. List the decisions and assets you need from me first. Do not write code until I approve the plan.
```
