# Milestone 4: Avatars

## Goal

Crew can build a unique 3D bust, and all five busts appear in the crew gallery from small stored records.

## Read first

`CLAUDE.md`, `docs/SPEC.md` section 6, `assets/logo/brand-board.png`.

## Decisions needed from the user before coding

- Avatar parts: procedural in code (recommended for version 1), a licensed asset pack, or a commissioned artist.
- Share or point to the reference avatars so the target look is clear.

## Tasks

- [ ] Define the avatar record as a versioned schema (version 1). Save only chosen option values, never images and never photos.
- [ ] Build the parts kit for the chosen route: head and face shape, skin tone, eyes, brows, nose, mouth, hairstyle and colour, facial hair, glasses and frame colour, earrings and chains, hoodie, collar and outfit colour. Soft, clay-like surfaces, rounded forms, warm lighting, studio background that matches the vault.
- [ ] Build the avatar renderer that rebuilds a bust from a record, used identically in the builder, the crew gallery and project rooms.
- [ ] Build the builder interface: a live 3D preview beside option panels, with save and reset.
- [ ] Add the photo reference panel: the member can open a photo beside the builder. It stays in the browser, is never uploaded or stored, and is released when they leave.
- [ ] Add animation: idle breathing, slow head turn, blink, a reaction when selected, and cursor follow on desktop.
- [ ] Add a test fixture proving that a version 1 record still renders after the kit changes.
- [ ] Put all five busts in the crew gallery from stored records.

## Done when

- A member can build, save and reload an avatar.
- All five busts appear in the crew gallery from stored, versioned records.
- Nothing about a member's real photo is sent over the network, proved by checking network activity in the builder.
- The version 1 fixture test passes.

## Out of scope

Full-body avatars and poses, AI generation.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/04-avatars.md. Milestones 1 to 3 are done. Enter plan mode. Propose a plan for milestone 4: the record schema, the parts approach for the route I chose, how the renderer is shared, and how you will verify that no photo leaves the browser. Ask me for any reference images or decisions you need. Do not write code until I approve the plan.
```
