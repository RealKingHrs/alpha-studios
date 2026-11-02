# Alpha Studios site: spec v0.2 (final draft)

Status: ready for implementation. Items marked **Proposed** are recommendations the user has not confirmed; ask before relying on them.

## 1. Vision

Alpha Studios gets a portfolio that behaves like a place, not a page: a quiet, dark vault that visitors move through to meet the studio's projects and its crew. Alpha Studios builds native iOS and macOS apps, web apps and more. At launch the vault holds two projects and five crew members, and visitors can try each project through the App Store, Play Store or GitHub.

Principles:

- Restraint first. Matte black, generous empty space, slow deliberate motion, gold used sparingly.
- Nothing generic. No purple gradients, frosted-glass card grids, stock copy or emoji icons. One easing curve, one spacing scale, one icon style.
- Open to everyone. Visitors see and try everything without logging in.
- Owned by the people in it. Crew manage their own profiles; the admin owns the studio.
- One flow, three experiences. Full 3D vault on desktop, a lighter touch version on phones, a calm static path for reduced-motion users.
- Free to run. Static frontend plus a free-tier backend.

Launch scope. In: the vault with intro, corridor and sound toggle; two project rooms; five crew busts and the avatar builder; the portal with invite codes, profile and project editors, and admin tools; live GitHub details and GitHub sign-in; phone lite mode and reduced-motion mode. Later: full-body avatars, a custom domain if wanted, embedded live demos for web projects, analytics, and any projects or crew beyond the launch set.

## 2. Decisions

| Area              | Decision                                                                                                                                 | Status                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Studio            | Alpha Studios: native iOS and macOS apps, web apps and more                                                                              | Decided                           |
| Concept           | The vault, an explorable 3D space, in a quiet luxury mood                                                                                | Decided                           |
| Logo              | A bold, calligraphic lowercase alpha in chrome with a gold flick                                                                         | Decided; trademark check pending  |
| Project page      | A gallery room per project with floating device mockups, team avatars and store or GitHub buttons                                        | Decided                           |
| Typography        | A clean sans with monospace accents (Inter and JetBrains Mono)                                                                           | Direction decided; fonts proposed |
| Colors            | Black, silver, chrome, gold and green with the roles in `design/tokens.css`                                                              | Proposed                          |
| Finishing touches | Cinematic intro that doubles as the loader, custom cursor with hover physics, sound off by default                                       | Decided                           |
| Avatars           | Head-and-shoulders 3D busts from a parts-kit builder, no AI; full-body later                                                             | Decided                           |
| Photos            | Used only as a reference while building an avatar, never stored                                                                          | Decided                           |
| Portal            | A separate dashboard at its own address, same brand                                                                                      | Decided                           |
| Devices           | Desktop first with the full 3D vault; phones get a lighter version                                                                       | Decided                           |
| Backend           | Static frontend plus a free-tier backend for data, login and uploads                                                                     | Decided; Supabase proposed        |
| Public content    | Visitors read a static content snapshot, so the vault stays up if the backend sleeps                                                     | Proposed                          |
| GitHub            | Live repo data on project cards, GitHub sign-in, contributors mapped to crew profiles                                                    | Decided                           |
| Access            | The admin issues one-time invite codes; the member then chooses their own login                                                          | Decided                           |
| Launch content    | Two projects and five crew members                                                                                                       | Decided                           |
| Permissions       | Visitors see everything; crew edit their own profile and project membership; only the admin adds or removes projects and controls access | Decided                           |
| Crew edits        | Go live instantly, recorded in an audit log, with one-click admin revert                                                                 | Proposed                          |

## 3. Brand

The mark is a bold, calligraphic lowercase alpha: a wide oval bowl with thick sides and thin top and bottom, and a heavy diagonal stem that sweeps out into a single flick. The flick fades from chrome into gold, so gold appears once on the mark. Files are in `assets/logo/`.

- Variants: chrome and gold on black (primary), black ink with the gold flick on light, and an app icon on a dark rounded square.
- Wordmark: ALPHA in a spaced sans, STUDIOS smaller in silver. Convert to outlines once the typeface is chosen.
- Small sizes: the thin parts of the stroke fade below about 20 px, so a bolder simplified favicon and tab icon is required (milestone 1).
- Motion: the intro draws the stem and flick as one stroke, then the gold spreads along the flick.
- Similarity risk: a lowercase alpha is a familiar shape; Sony describes its lowercase alpha logo as a trademark and Alpha Corporation uses a diamond around a stylized alpha. A trademark register search for "Alpha Studios" and for lowercase-alpha marks in software and app classes is required before launch. Fallbacks: the arch mark from the first design round, or a more distinctive construction such as a broken bowl.

## 4. Design system

Tokens live in `design/tokens.css`. Colour roles:

| Role         | Hex     | Contrast on Obsidian | Used for                                       |
| ------------ | ------- | -------------------- | ---------------------------------------------- |
| Obsidian     | #0B0C0D | n/a                  | Page background, vault walls                   |
| Graphite     | #16181B | n/a                  | Panels, pedestals, cards                       |
| Chrome       | #E9ECEF | 16.5:1               | Headlines, reflective surfaces, key highlights |
| Silver       | #A9AFB6 | 8.9:1                | Body text, labels, hairline borders            |
| Gold         | #C9A24B | 8.2:1                | Focus, the logo flick, featured project, admin |
| Emerald      | #1F9D6B | 5.7:1                | Interactive controls and live status           |
| Emerald glow | #3DDC97 | 11.1:1               | Small green text and glow on hover             |

- Gold budget: at most one gold element in any view, except in the admin portal where gold marks admin-only controls. Emerald means something you can act on or something live. They never share an element.
- Typography: one clean sans in regular and medium weights, monospace for small labels, version numbers, build dates and code details. Modular type scale, large quiet headlines, generous line spacing.
- Spacing and layout: one 8 px scale; a 12-column grid for the dashboard and flat overlays on the vault; large margins.
- Motion: one easing curve and three durations. Camera moves are slow and eased. Elements enter in a fixed order: background, object, label. Nothing bounces.
- Cursor and hover: a small custom cursor that grows over interactive objects; magnetic pull on buttons and pedestals; objects tilt slightly toward the pointer. Touch screens get tap ripples.
- Sound: off by default with a visible mute toggle. Browsers block audio until interaction, so the intro is silent and sound starts only after the first tap or click on the toggle. Low ambient hum, soft interface ticks, a chime on opening a project room. Files are small and load after the intro.
- Icons and imagery: one outline icon set at one stroke weight. Project imagery is real app screenshots in device frames, never stock photos.
- States: designed loading, empty, error and offline states for every screen, including a branded 404 inside the vault.
- Accessibility: full keyboard navigation of the vault, visible gold focus rings, text alternatives for 3D objects, a reduced-motion mode that replaces camera moves with fades, labels for any sound cues.
- Performance targets (decided): under 3 MB downloaded before the corridor appears with other 3D assets streaming during the intro; 60 frames per second on a recent laptop; automatic lite mode if frame rate stays under 30 for two seconds or the device reports low power; compressed models and textures; each project room loaded only when visited.

## 5. The vault

One continuous space with no menu bar. The camera flies forward and back; every page of the site is a place in it.

- Intro and loader: the alpha assembles in chrome, the gold flick draws through, and the doors open onto the corridor. It plays while assets load, can be skipped, and plays in full only on the first visit.
- The journey, five beats in order: entrance (logo and studio statement); project hall (two lit pedestals); crew gallery (five busts on a curved roster platform); contact alcove (get in touch or join); keyhole door to the crew portal at the far end. Beats are spaced so the camera always has something to travel toward.
- Moving: scroll, arrow keys, swipe or on-screen forward and back controls move the camera, easing to rest in front of each pedestal. Pointer movement shifts the view slightly. A small index shows position and lets visitors jump.
- Project rooms: selecting a pedestal glides the camera through a doorway into that project's gallery room, with the app on floating iPhone, Mac or browser frames, a short story, the tech used, the team busts, live GitHub details, and buttons for the App Store, Play Store or GitHub. A back control returns to the same spot in the corridor.
- Crew profiles: selecting a bust brings it forward under a spotlight with role, bio, project memberships and social links (GitHub, LinkedIn, YouTube, Snapchat, Instagram).
- Shareable places and search: every pedestal, room and profile has its own address. Each address also serves ordinary HTML with text, links, page title and a share image, generated at build time from the content snapshot. Static hosting needs a fallback page or pre-built pages for these addresses.
- Phones: the same corridor with fewer lights and reflections, lower-resolution 3D and touch-first controls; a simple vertical flow if the device cannot cope.
- Reduced motion: camera flights become fades; the intro becomes a still logo.

## 6. Crew avatars

Each member builds a head-and-shoulders 3D bust from a parts kit. No AI service.

- Builder: live 3D preview beside option panels: head and face shape, skin tone, eyes, brows, nose, mouth, hairstyle and colour, facial hair, glasses and frame colour, earrings and chains, outfit with hoodie, collar and colour. Styling: soft clay-like surfaces, rounded forms, warm lighting, clean studio background matching the vault.
- Photo as guide: the member may open their real photo beside the builder as a reference. It stays in the browser and is never uploaded or stored.
- Stored data: only chosen options, as a small versioned record (for example avatar version 1, hair style 4, skin tone 7). The avatar is rebuilt from the values wherever it appears. The version keeps old avatars rendering after the kit changes and lets better parts or a full body be added later.
- Animation: idle breathing, slow head turn, blink; a friendly reaction when selected; the bust follows the cursor on desktop.
- Art production (Proposed): ship version 1 with procedural parts built in code from soft shapes and materials, then swap in modeled parts later through the same record. Alternatives: a licensed asset pack (licence must allow web use and modification) or a commissioned 3D artist.

## 7. Portal and roles

A separate dashboard at its own address, same brand, calm and form-based. For crew and the admin only. A discreet crew login link on the site leads to it.

| Action                                 | Visitor | Crew         | Admin        |
| -------------------------------------- | ------- | ------------ | ------------ |
| View vault, projects and profiles      | Yes     | Yes          | Yes          |
| Try projects via store or GitHub links | Yes     | Yes          | Yes          |
| Edit own profile, bio and social links | No      | Yes          | Yes          |
| Build or rebuild own avatar            | No      | Yes          | Yes          |
| Join or leave a project                | No      | Yes          | Yes          |
| Edit a project's details and links     | No      | Own projects | All projects |
| Add or delete a project                | No      | No           | Yes          |
| Issue, revoke or reset access codes    | No      | No           | Yes          |
| Edit or remove any crew member         | No      | No           | Yes          |
| Edit site content and settings         | No      | No           | Yes          |

Joining as crew:

1. The admin creates a member in the portal, and the system issues a one-time invite code. The code is stored hashed, expires after a set time and works once.
2. The member opens the portal and enters the code. Wrong guesses are rate-limited.
3. The member signs in with GitHub or with email and password. That login is linked to their member record, and the code is spent.
4. They build their avatar, add links and bio, and add themselves to projects.
5. If a member loses access, the admin reissues a code. The admin can revoke access at any time, which locks the account but keeps the profile.

Admin account and safeguards: exactly one admin, created once during setup directly in the backend, signing in with GitHub with two-factor authentication on. Setup records a recovery path: the backend owner's own login can restore admin access. Every change by crew or admin is written to an audit log and can be reverted. Crew can join or leave any project; the admin can remove anyone from a project.

Review policy (Proposed): crew edits go live immediately and are audited; the admin can revert with one click. A review queue can be added for project details only if the user prefers.

Dashboard screens: Home (activity, drafts, anything awaiting the admin); My profile (bio, links, avatar builder); Projects (list and editor: name, summary, status, platforms, screenshots, tech used, store and GitHub links, optional demo link, team); Crew (admin: members, invite codes, access); Site settings (admin: studio text, intro, sound default, featured project).

## 8. Architecture and data model

The public vault reads a static content snapshot and never calls the backend, so it stays up when the free backend is asleep. Only the portal uses the backend. A publish job turns approved content into a fresh snapshot.

Flow: Visitors use the vault site, which reads the snapshot. Crew and admin use the portal, which reads and writes the backend. The backend holds login, database and images. GitHub supplies repo data and sign-in to the backend. The publish job (a GitHub Action) reads content from the backend, writes the snapshot, rebuilds the site, and pings the backend. It runs after each publish and daily; a scheduled run also heals a missed trigger.

| Data               | Holds                                                                                                          | Who can write                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Members            | Name, role, bio, social links, versioned avatar record, access status                                          | The member for their own row; admin for all         |
| Projects           | Name, summary, status, platforms, screenshots, tech used, store links, repo, optional demo link, featured flag | Admin; a project's own members can edit its details |
| Project membership | Which member is on which project                                                                               | The member for themselves; admin for all            |
| Invites            | Hashed one-time codes, expiry, used flag                                                                       | Admin                                               |
| Site settings      | Studio text, intro and sound defaults                                                                          | Admin                                               |
| Repo cache         | Stars, languages, recent commits, contributors per repo                                                        | The publish job                                     |
| Audit log          | Who changed what and when, with the previous value                                                             | The system only                                     |
| Content snapshot   | A public JSON copy of members, projects, repo details and avatar records                                       | The publish job only                                |

GitHub integration: project cards show stars, languages, recent commits and contributors. The publish job fetches them with a server-side token and stores them in the snapshot, so visitors' browsers never call the GitHub API. A contributor whose GitHub username matches a crew profile appears as that member's bust. Crew can sign in with GitHub.

Security: roles enforced by row-level security. Invite codes hashed, single-use, expiring and rate-limited. No secret in the public repo; the backend's public key is safe only because the rules are strict; the GitHub token and service keys live in the build service's secret store. Real photos are never stored. Screenshots are resized and size-limited. Member names and links are public by design: each member agrees when joining and the admin can remove any profile on request.

Free-tier facts (checked 2 November 2026; recheck before launch): Supabase pauses free projects with too little database activity over a week; a few requests a day usually keeps one awake and a paused project keeps its data (https://supabase.com/kb/faqs/platform/free-project-pausing). GitHub Pages sites may be no larger than 1 GB, with a soft bandwidth limit of 100 GB a month and a soft limit of 10 builds an hour that does not apply to custom GitHub Actions workflows (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## 9. Milestones

Each step ends with something the user can open and test. A step is finished only when its "Done when" is true. Briefs are in `docs/milestones/`.

| Step                | Done when                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Foundation        | Repo, free hosting and backend set up; the admin can sign in; database rules enforce the three roles; the publish job builds a snapshot and the empty site loads from it; direct links work on the host; the bolder favicon cut exists |
| 2 Vault v1          | Intro plays and can be skipped; the camera travels the five beats by scroll, keys and touch; pedestals and busts are placeholders; lite mode and reduced-motion mode work; every address also serves readable HTML                     |
| 3 Project rooms     | Both projects open in rooms with device mockups, store and GitHub buttons and repo details from the snapshot; each room has its own working link                                                                                       |
| 4 Avatars           | A member can build, save and reload an avatar; all five busts appear in the crew gallery from stored, versioned records                                                                                                                |
| 5 Portal            | Admin can issue an invite code and a member can redeem it; crew can edit their profile and join or leave projects; only the admin can add or delete projects; the audit log shows changes and the admin can revert one                 |
| 6 Polish and launch | Sound, cursor and hover physics done; performance targets met or gaps listed; accessibility checks pass; trademark search complete; real content in; site published                                                                    |

## 10. Risks and mitigations

| Risk                                                 | Mitigation                                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The free backend sleeps and the portal stops working | Public site reads a snapshot; daily ping; a paused project can be resumed with its data intact |
| Avatar art falls short of the references             | Procedural parts first, then modeled parts through the versioned record                        |
| 3D too heavy for some phones                         | Lite mode with automatic fallback, a download budget, a plain HTML layer                       |
| The alpha mark conflicts with an existing trademark  | Search the register before launch; keep the arch mark as a fallback                            |
| Scope keeps growing                                  | Fixed launch scope, a separate later list, steps that end in a testable result                 |
| The admin account is lost                            | Recovery path recorded at setup; the backend owner can restore admin access                    |
| Free plans change their limits                       | Recheck before launch; keep content as portable JSON                                           |

## 11. Open questions (ask the user before the step that needs them)

- Avatar parts: procedural first (recommended), a licensed pack, or a commissioned artist? Needed before step 4.
- Supabase (recommended) or Firebase? Needed before step 1.
- Crew edits live with an audit log (proposed) or a review queue? Needed before step 5.
- A free hosting address or a custom domain the user will buy? Needed before step 1.
- Should web projects embed a live demo or only link out? Needed before step 3.
- Who writes the studio statement, five bios and two project descriptions, and supplies screenshots? Use `content/CONTENT-TEMPLATE.md`. Needed before step 3.
- Who sources or composes the ambient and interface sounds? Needed before step 6.
- When will the trademark search be done? Needed before step 6.
