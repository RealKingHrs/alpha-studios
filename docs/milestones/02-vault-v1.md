> **Retired on 3 November 2026.** The 3D vault, project rooms and Explore mode were removed in the redesign. This brief is kept as history. See `docs/SPEC.md` section 5.

# Milestone 2: Vault v1

## Goal

The explorable vault with its intro and five beats, using placeholder pedestals and busts, fast and accessible.

## Read first

`CLAUDE.md`, `docs/SPEC.md` sections 4 and 5, `design/tokens.css`, `assets/logo/`.

## Tasks

- [ ] Build the 3D scene in the palette: obsidian walls, graphite pedestals, a polished floor, restrained lighting. Use gold for at most one element per view.
- [ ] Build the intro and loader: the alpha assembles in chrome and the gold flick draws through, then the doors open. Skippable. Full length on first visit only (remember it with storage wrapped in try/catch). Silent.
- [ ] Lay out the five beats: entrance, project hall with two pedestals, crew gallery with five busts on a curved platform, contact alcove, keyhole door. Use placeholder objects for pedestals and busts.
- [ ] Camera movement along one path by scroll, arrow keys, swipe and on-screen forward and back controls, easing to rest at each pedestal. Pointer movement shifts the view slightly.
- [ ] A small position index in a corner that also lets visitors jump to a beat.
- [ ] Give every beat, pedestal and profile its own address. Each address also serves real HTML with the text, links, title and a share image, built from the snapshot. The scene is layered on top.
- [ ] Lite mode: fewer lights and reflections, lower-resolution 3D, touch-first controls, and an automatic switch when frame rate stays under 30 for two seconds or the device reports low power. Include a plain vertical fallback flow.
- [ ] Reduced-motion mode: camera flights become fades and the intro becomes a still logo.
- [ ] Keyboard navigation with visible gold focus rings and text alternatives for 3D objects.
- [ ] Add a frame-rate and download-size readout in a dev panel so the performance targets in the spec can be measured.

## Done when

- The intro plays, can be skipped, and is silent.
- The camera travels all five beats by scroll, keys and touch.
- Pedestals and busts are placeholders but correctly placed.
- Lite mode and reduced-motion mode work and were tried on a phone-sized viewport.
- Every address also serves readable HTML.
- The measured numbers against the performance targets are written down, with any gaps listed.

## Out of scope

Real project rooms, avatars, sound, the custom cursor and the portal.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/02-vault-v1.md. Milestone 1 is done. Enter plan mode. Propose a plan for milestone 2: the scene structure, the camera path approach, how the HTML layer and the 3D layer share the same routes, and how you will verify each "Done when" line, including on a phone-sized viewport. Do not write code until I approve the plan.
```
