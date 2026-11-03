# Alpha Studios site: spec v0.2 (final draft)

Status: ready for implementation. Items marked **Proposed** are recommendations the user has not confirmed; ask before relying on them.

## 1. Vision

Alpha Studios gets a portfolio that leads with the work: a bright, premium, richly animated studio site where visitors see two projects and five people straight away. (The explorable 3D vault was retired on 3 November 2026.) Alpha Studios builds native iOS and macOS apps, web apps and more. At launch the site shows two projects and five crew members, and visitors can try each project through the App Store, Play Store or GitHub.

Principles:

- Formal structure, playful details. A strict grid, numbered sections and a restrained type scale carry the formality; colour, motion and small surprises carry the play.
- Nothing generic. No purple gradients, frosted-glass card grids, stock copy or emoji icons. One easing curve, one spacing scale, one icon style.
- Open to everyone. Visitors see and try everything without logging in.
- Owned by the people in it. Crew manage their own profiles; the admin owns the studio.
- One site, three feels. Full motion with smooth scrolling and a custom cursor on desktop, a lighter touch version on phones, a calm static path for reduced-motion users.
- Free to run. Static frontend plus a free-tier backend.

Launch scope. In: the animated site with intro, work, case studies and crew profiles; five geometric crew characters and the avatar builder; the portal with PIN and emailed-code sign-in, profile and project editors, and admin tools; live GitHub details; reduced-motion mode. Later: full-body avatars, a custom domain if wanted, embedded live demos for web projects, analytics, and any projects or crew beyond the launch set.

## 2. Decisions

| Area              | Decision                                                                                                                                 | Status                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Studio            | Alpha Studios: native iOS and macOS apps, web apps and more                                                                              | Decided                           |
| Concept           | The vault, an explorable 3D space, in a quiet luxury mood                                                                                | Decided                           |
| Logo              | A bold, calligraphic lowercase alpha in chrome with a gold flick                                                                         | Decided; trademark check pending  |
| Project page      | A case study per project with parallax device mockups, team characters and store or GitHub buttons                                       | Decided                           |
| Typography        | A clean sans with monospace accents (Inter and JetBrains Mono)                                                                           | Direction decided; fonts proposed |
| Colors            | Black, silver, chrome, gold and green with the roles in `design/tokens.css`                                                              | Proposed                          |
| Finishing touches | Cinematic intro that doubles as the loader, custom cursor with hover physics, sound off by default                                       | Decided                           |
| Avatars           | Head-and-shoulders 3D busts from a parts-kit builder, no AI; full-body later                                                             | Decided                           |
| Photos            | Used only as a reference while building an avatar, never stored                                                                          | Decided                           |
| Portal            | A separate dashboard at its own address, same brand                                                                                      | Decided                           |
| Devices           | Desktop first with smooth scrolling and a custom cursor; phones keep native touch scrolling                                              | Decided                           |
| Backend           | Static frontend plus a free-tier backend for data, login and uploads                                                                     | Decided; Supabase proposed        |
| Public content    | Visitors read a static content snapshot, so the site stays up if the backend sleeps                                                      | Proposed                          |
| GitHub            | Live repo data on project cards, GitHub sign-in, contributors mapped to crew profiles                                                    | Decided                           |
| Access            | The admin registers each person's email and issues a personal PIN; sign-in is the PIN then a code emailed to that address                | Decided                           |
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

| Role | Hex | Contrast on Obsidian | Used for |
| ---- | --- | -------------------- | -------- |

- Colour rules (site): accent colours are fills with ink text, never text on paper. Gold appears only as the flick of the logo, plus admin-only controls in the portal.
- Focus: a 3 px ink ring on paper (gold does not reach 3:1 on paper).
- Typography: one clean sans in regular and medium weights, monospace for small labels, version numbers, build dates and code details. Modular type scale, large quiet headlines, generous line spacing.
- Spacing and layout: one 8 px scale; a 12-column grid for pages and the dashboard; large margins.
- Motion: one house easing curve. Headlines rise word by word out of masks, panels stack as you scroll, devices drift at three depths, the marquee follows scroll speed, pages change with a colour-band wipe, buttons lean toward the pointer. Smooth scrolling for mouse users only. All of it switches off for reduced motion and by the "Playful effects" switch, and the content is complete without it.
- Cursor and hover: a dot with a lagging ring that swells over things you can act on and becomes a labelled bubble ("Open", "Meet") over cards; magnetic buttons; tap ripples on touch.
- Sound: none. (Retired with the vault.)
- Icons and imagery: one outline icon set at one stroke weight. Project imagery is real app screenshots in device frames, never stock photos.
- States: designed loading, empty, error and offline states for every screen, including a playful branded 404.
- Accessibility: full keyboard navigation, a visible 3 px ink focus ring, focus moved to the new page heading after each change and announced, a reduced-motion mode that removes every effect.
- Performance targets (decided): under 3 MB downloaded before the page appears (this site holds itself to under 500 kB); 60 frames per second on a recent laptop; every effect off for reduced motion; fonts self-hosted.

## 5. The site

The site is a set of real pages, each with its own address and prerendered HTML: the home page (hero, a marquee of the tech used, the work as stacking coloured panels with device mockups, the crew lineup, contact), a case study for each project, a profile for each crew member, and a playful 404. Motion is layered on top: smooth scrolling, scroll-linked parallax, masked text reveals, page transitions, magnetic buttons and a refined cursor. Every effect switches off for reduced motion and by the "Playful effects" switch, and the content is complete without any of it.

## 5a. Batch 9 additions (3 November 2026)

- **Visual identity (batch 23, bold editorial pop).** The site reads like a magazine issue made by twenty-year-olds. Light paper only; there is no dark mode. Flat colour blocks in the five accents with ink text, 1.5 px printed rules, no gradients, glow, glass or blur. Fraunces at 800 for display, set huge and tight; Inter for text; JetBrains Mono for labels. Tokens keep the maths: golden-ratio type, Fibonacci space, 7 + 5 golden splits, one spring. The logo is wordmark led: "alpha." in Fraunces italic 800 with a gold full stop over "studios" in spaced mono; the favicon and app icons are the "a." cut. The catchphrase is "We build software" over an orange block whose ending cycles (people rely on, that scales, built to last, your users trust), with "Built at twenty. Engineered for real." under the lede; the eyebrow says Native apps, Web platforms, APIs. Home: masthead with issue line, magazine-cover hero with cover lines and the crew strip, a tracklist contents, an angled marquee, a manifesto with colour-block principles, what we make (iOS, macOS, web, AI and ML, APIs), full-colour project drops, how we build (four steps on a line that draws as you scroll), the stack as a periodic table, FAQ, a cover-stars crew grid, and a full-colour contact block. Motion: words rise from a mask, colour blocks wipe (page change, menu, intro), cards lift with a hard shadow; all off under reduced motion. Version 1 print touches: a round rubber stamp ("alpha studios · built at twenty" around an "a.") on the cover and footer, hand-drawn arrow, underline and pencil circle, a starburst on the latest drop, rubber status stamps (BETA, LIVE), a perforated ticket tracklist, postage-stamp crew numbers, margin notes and a barcode in the footer. The cursor is a solid ink dot and ring with a paper halo (no blend modes). Portal sign-in is a personal PIN on five wheels then a six-digit code emailed to the registered address (no passwords, no sign-up, invite codes retired from the UI). The hidden door hands the PIN to the portal inside the same browser tab. The Launchpad page carries the pitch form (an email, no sign-in); the portal's Launchpad ideas screen is read-only for crew and fully editable for the admin. Crew edit only the projects the admin assigns. Pop-culture wording stays (drops, cover stars, tracklist, unlocked achievements, "this page got cancelled", post-credit line). Copy is a draft for the studio to edit.
- **Polish layer (batches 13 and 14).** One elevation scale (`--shadow-1/2/3`), one reveal distance and step, arrow buttons, a reading-progress line under the header, a full-screen phone menu, a back-to-top button, animated counters, an at-a-glance strip and larger next-project panel on case studies, and slim skill bars on profiles. The cursor is only a dot and a thin ring that grows over things you can act on; it never fills in or shows words.
- **Crew list.** Editorial cover cards on the landing page and Crew page: accent colour, outlined first name, the character, call-sign sticker, project chips on hover.
- **Certificate pages (batch 16).** Each certificate has its own address (`/crew/<member>/certificates/<id>/`) with a certificate-style panel, issue and expiry dates (status judged on the publish date), an optional public credential ID, and a link to verify with the issuer. The site does not verify certificates and stores no certificate files.
- **Member details (batch 16).** Location, open to, languages, interests, experience and education are optional fields on each member; empty ones are not shown.
- **Member page (batch 15).** A scrolling story: full-bleed hero with the favourite-show scene (`popTheme.ts`, `PopScene.tsx`; original drawings only, no logos, characters, costumes or quotes), a huge outlined name, the waving avatar (`WavingPortrait.tsx`), a ticker, the bio as a big quote, then tiles (toolkit radar and levels, favourite, works, achievements, links) and a panel for the next crew member. Sample crew, projects and links in `content/seed/content.json` are fictional and must be replaced before launch (`npm run content:check`).
- **Crew profiles.** The bio is the tagline (160 characters, written by the member or suggested through the backend function `suggest-tagline`). Skills are picked and rated in the portal. Cards show only the name and call sign; profiles add skills, works with roles and a certificate shelf. Certificates are their own table (own CRUD, admin all, public read, audited, revertable). Original notes:
- **Crew dossiers.** Members have a codename, tagline, skills, what they are on now, a fun fact and a pop pick; each project membership has a role; certifications are their own table (own CRUD, admin all, public read, audited, revertable). Crew cards and profiles show works and an achievements shelf with empty "next unlock" slots.
- **Launchpad.** A bright, encouraging page for newcomers, and a pitch form that opens an email to the studio (the public site never calls the backend; the admin logs ideas in the portal, `submissions`, readable by crew, editable by the admin). Crew do not pitch. The admin approves through `approve_submission`, which creates the project, locks the founder credit and creates an unclaimed founder profile to invite. A locked credit cannot be changed or removed from the app, by anyone including the admin; only the backend owner can, on purpose. The public page does not describe the studio's internal process, and ownership and support terms are agreed in writing with each founder (this site does not define them).
- **Consistency.** Stacking panels only stack when every panel fits the screen (`src/site/motion/viewport.ts`); parallax is in percent; marquee speed follows viewport width; the cursor uses a white difference blend so it reads on every surface.

## 6. Crew avatars

Each member builds a bold geometric character, drawn as animated SVG, from a parts kit. No AI service.

- Builder: live preview beside option panels: head and face shape, skin tone, eyes, brows, nose, mouth, hairstyle and colour, facial hair, glasses and frame colour, earrings and chains, outfit with hoodie, collar and colour. Styling: flat colour, ink outlines, a coloured disc backdrop that matches the site.
- Photo as guide: the member may open their real photo beside the builder as a reference. It stays in the browser and is never uploaded or stored.
- Stored data: only chosen options, as a small versioned record (for example avatar version 1, hair style 4, skin tone 7). The avatar is rebuilt from the values wherever it appears. The version keeps old avatars rendering after the kit changes and lets better parts or a full body be added later.
- Animation: idle breathing, blinking on each character's own beat, eyes and head that follow the cursor, brows and mouth that react on hover, a hop, and a wave when the profile character is tapped. Still when motion is reduced.
- Art production (decided): the characters are drawn in code from the stored options, so every saved avatar keeps working; the options are frozen per kit version.

## 7. Portal and roles

A separate dashboard at its own address, same brand, calm and form-based. For crew and the admin only. A discreet crew login link on the site leads to it.

| Action                                 | Visitor | Crew         | Admin        |
| -------------------------------------- | ------- | ------------ | ------------ |
| View site, projects and profiles       | Yes     | Yes          | Yes          |
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

1. The admin creates a member in the portal with their email, and the system issues a personal five-character PIN. The PIN is stored hashed and shown once; reissuing replaces it.
2. The member sets the PIN on five wheels. A right PIN emails a six-digit code to their registered address. Wrong guesses are rate-limited.
3. The right code opens the portal and links that login to their member record, once.
4. They build their avatar, add links and bio, and edit the projects the admin assigned to them.
5. If a member loses access, the admin reissues their PIN. The admin can revoke access at any time, which locks the account but keeps the profile.

Admin account and safeguards: exactly one admin, created once during setup directly in the backend, signing in with a PIN and an emailed code (the admin's email account should have two-factor authentication on). Setup records a recovery path: the backend owner's own login can restore admin access. Every change by crew or admin is written to an audit log and can be reverted. Crew can join or leave any project; the admin can remove anyone from a project.

Review policy (Proposed): crew edits go live immediately and are audited; the admin can revert with one click. A review queue can be added for project details only if the user prefers.

Dashboard screens: Home (activity, drafts, anything awaiting the admin); My profile (bio, links, avatar builder); Projects (list and editor: name, summary, status, platforms, screenshots, tech used, store and GitHub links, optional demo link, team); Crew (admin: members, invite codes, access); Site settings (admin: studio text, contact email, intro, featured project).

## 8. Architecture and data model

The public site reads a static content snapshot and never calls the backend, so it stays up when the free backend is asleep. Only the portal uses the backend. A publish job turns approved content into a fresh snapshot.

Flow: Visitors use the site, which reads the snapshot. Crew and admin use the portal, which reads and writes the backend. The backend holds login, database and images. GitHub supplies repo data and sign-in to the backend. The publish job (a GitHub Action) reads content from the backend, writes the snapshot, rebuilds the site, and pings the backend. It runs after each publish and daily; a scheduled run also heals a missed trigger.

| Data               | Holds                                                                                                          | Who can write                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Members            | Name, role, bio, social links, versioned avatar record, access status                                          | The member for their own row; admin for all         |
| Projects           | Name, summary, status, platforms, screenshots, tech used, store links, repo, optional demo link, featured flag | Admin; a project's own members can edit its details |
| Project membership | Which member is on which project                                                                               | The member for themselves; admin for all            |
| Invites            | Hashed one-time codes, expiry, used flag                                                                       | Admin                                               |
| Site settings      | Studio text, contact email and intro default                                                                   | Admin                                               |
| Repo cache         | Stars, languages, recent commits, contributors per repo                                                        | The publish job                                     |
| Audit log          | Who changed what and when, with the previous value                                                             | The system only                                     |
| Content snapshot   | A public JSON copy of members, projects, repo details and avatar records                                       | The publish job only                                |

GitHub integration: project cards show stars, languages, recent commits and contributors. The publish job fetches them with a server-side token and stores them in the snapshot, so visitors' browsers never call the GitHub API. A contributor whose GitHub username matches a crew profile appears as that member's bust. Crew can sign in with GitHub.

Security: roles enforced by row-level security. Invite codes hashed, single-use, expiring and rate-limited. No secret in the public repo; the backend's public key is safe only because the rules are strict; the GitHub token and service keys live in the build service's secret store. Real photos are never stored. Screenshots are resized and size-limited. Member names and links are public by design: each member agrees when joining and the admin can remove any profile on request.

Free-tier facts (checked 2 November 2026 and again on 3 November 2026, unchanged; recheck before launch): Supabase pauses free projects with too little database activity over a week; a few requests a day usually keeps one awake and a paused project keeps its data; Supabase emails about a week before a pause; the page does not say how long a paused project stays restorable, so do not rely on a window (https://supabase.com/kb/faqs/platform/free-project-pausing). GitHub Pages sites may be no larger than 1 GB, with a soft bandwidth limit of 100 GB a month and a soft limit of 10 builds an hour that does not apply to custom GitHub Actions workflows (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## 9. Milestones

Milestones 2 and 3 were built as a 3D vault and project rooms, then retired in the redesign of 3 November 2026 (see section 5). The rows below describe the original plan; the animated site replaced the vault and rooms, and sound was dropped.

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

| Risk                                                 | Mitigation                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The free backend sleeps and the portal stops working | Public site reads a snapshot; daily ping; a paused project can be resumed with its data intact                |
| Avatar art falls short of the references             | Procedural parts first, then modeled parts through the versioned record                                       |
| Motion too heavy or distracting for some visitors    | Every effect off for reduced motion and by a switch, a download budget enforced by a test, a plain HTML layer |
| The alpha mark conflicts with an existing trademark  | Search the register before launch; keep the arch mark as a fallback                                           |
| Scope keeps growing                                  | Fixed launch scope, a separate later list, steps that end in a testable result                                |
| The admin account is lost                            | Recovery path recorded at setup; the backend owner can restore admin access                                   |
| Free plans change their limits                       | Recheck before launch; keep content as portable JSON                                                          |

## 11. Open questions (ask the user before the step that needs them)

- Avatar parts: procedural first (recommended), a licensed pack, or a commissioned artist? Needed before step 4.
- Supabase (recommended) or Firebase? Needed before step 1.
- Crew edits live with an audit log (proposed) or a review queue? Needed before step 5.
- A free hosting address or a custom domain the user will buy? Needed before step 1.
- Should web projects embed a live demo or only link out? Needed before step 3.
- Who writes the studio statement, five bios and two project descriptions, and supplies screenshots? Use `content/CONTENT-TEMPLATE.md`. Needed before step 3.
- When will the trademark search be done? Needed before step 6.
