# Real content checklist

Where each item in `CONTENT-TEMPLATE.md` goes. Run `npm run content:check` to list placeholder text still left in `content/seed/content.json`; it exits with an error until none remain.

## Studio

- Studio statement and contact email: portal, Site settings (or `settings` in the seed file).

## Each project

- Name, summary, story, status, platforms, tech, links, repository: portal, Projects, Edit details.
- Screenshots (at least three, with the device for each): `public/screenshots/` and the project's `screenshots` list.
- Team and each person's role on the project: crew join the project in the portal, then set their role under Projects.

## Each crew member

- Name, role, bio, links, GitHub username: portal, My profile.
- Codename, tagline, skills (for example `React:5, Swift:3`), currently, fun fact, pop pick: portal, My profile.
- Certificates: portal, Certificates (each becomes a trophy).
- Avatar: portal, My avatar. Then run `npm run render:3d` so the Blender render matches the saved avatar.
- Consent to show name, role, bio and links publicly: given when redeeming the invite.

## Before launch

1. `npm run content:check` reports nothing left.
2. `npm run render:3d` re-run, new files committed.
3. A lawyer has written the Launchpad terms (see `docs/RUNBOOK.md`).
