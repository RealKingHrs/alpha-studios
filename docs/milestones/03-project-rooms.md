# Milestone 3: Project rooms

## Goal

Each project opens into its own gallery room with device mockups, a story, the team and the buttons visitors use to try the app.

## Read first

`CLAUDE.md`, `docs/SPEC.md` sections 5 and 8, `content/CONTENT-TEMPLATE.md`.

## Decisions needed from the user before coding

- Do web projects embed a live demo, or only link out?
- Real project content and screenshots, or placeholders for now.

## Tasks

- [ ] Build the room scene and the doorway transition from the project hall, and a back control that returns to the same spot in the corridor.
- [ ] Build device frames for iPhone, Mac and browser that display project screenshots as floating objects.
- [ ] Show the short story, tech used, platform badges and project status from the snapshot.
- [ ] Show the team as busts or placeholders, linked to crew profiles.
- [ ] Show live repo details from the snapshot: stars, languages, recent commits and contributors. Map contributors to crew profiles by GitHub username.
- [ ] Add buttons for the App Store, Play Store and GitHub, shown only when the link exists. If the user decided on live demos, add a sandboxed demo for web projects.
- [ ] Give each room its own address that also serves readable HTML and a share image.
- [ ] Load each room only when visited.
- [ ] Handle loading, error and offline states for rooms.

## Done when

- Both projects open in rooms with device mockups, store and GitHub buttons and repo details from the snapshot.
- Each room has its own working link, and the back control returns to the right place.
- A project with no App Store link shows no App Store button.
- Public pages still make no backend call.

## Out of scope

Real avatars, the portal's project editor, sound.

## Kickoff prompt

```text
Read CLAUDE.md, docs/SPEC.md and docs/milestones/03-project-rooms.md. Milestones 1 and 2 are done. Enter plan mode. Propose a plan for milestone 3, including how rooms load lazily, how device frames display screenshots, and how you will verify each "Done when" line. List the decisions and content you need from me first. Do not write code until I approve the plan.
```
