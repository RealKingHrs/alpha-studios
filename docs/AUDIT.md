# Full audit, 3 November 2026 (updated after the batch 22 rebuild)

## Batch 22 re-check (full visual rebuild, two themes)

- Lint, format, typecheck, build (19 pages plus 404) and 118 unit tests pass; contrast test covers both themes; new theme test covers the head script and blocked storage.
- Role tests: 58 passing against the local Supabase stack (no database changes in this batch).
- axe (WCAG 2.1 AA): no violations on the 10 public addresses in dark and in light, nor on the portal sign-in screen in both themes. Signed-in portal screens were not re-run.
- No horizontal overflow at 375 px on the 10 public addresses. First visit 281 kB.
- Not verified here: animation smoothness (the preview throttles frames) and real devices.

## Earlier record (batch 17)

Everything below was run against the local build and the local backend. Nothing is deployed.

## Checked and passing

- `lint`, `format:check`, `typecheck`, `build` (18 pages plus 404), 107 unit tests, 57 role tests against the local backend.
- First visit 334.7 kB (budget 500 kB, test limit 3 MB). No 3D or backend client in any public file.
- Production dependencies: 0 known vulnerabilities.
- No secrets in tracked files; the service key is not in `src` or `dist`; `.env.local` and `.dev-credentials` are ignored.
- Built-page crawl: every page has one title, a description, a share image, `lang`, exactly one `h1`; no broken internal links or images; no local addresses.
- Accessibility (axe, WCAG 2 A and AA plus best practice): 0 findings on all 19 public addresses and all 9 portal screens.
- Reduced motion: no looping animation on any public address.
- Layout: no sideways overflow at 10 sizes (2560 down to 320 wide) on home, crew, member, case study, Launchpad, contact, certificate and 404.
- Real navigation (desktop and 390 wide, first visit and returning): no console errors, no failed requests, no backend calls from public pages.
- Row-level security on every table; visitors can only read; `members` columns for visitors are an explicit list.

## Found and fixed during the audit

- `certifications` had inherited full table privileges (including TRUNCATE) for visitors and signed-in users. Row policies already blocked writes through the API, but migration `20261103060000_tighten_grants.sql` removes the privileges, changes the default for new tables, and fails if any public table ever gives a visitor more than read access.
- Two horizontal scrollbars on the crew row: the browser's own plus the progress line. The browser's is now hidden.
- Dead code removed: old profile-mode crew component, unused skills and works lists, and their styles.

## Known limits (cannot be settled locally)

- One moderate advisory in the lint tool chain (`minimatch`, development only, fix requires a breaking downgrade). Not shipped to visitors.
- Animation smoothness, touch behaviour and screen readers need a real browser, a real phone and real assistive technology.
- Workflows in `.github/workflows` have never run; they are read and valid but untested.
- The Suggest-a-line function needs a provider key and has only been tested with a mocked model.
- Sample crew, projects and links are fictional (`npm run content:check` lists them). Launchpad legal terms are unwritten.
- Nothing has been deployed, so hosting limits, the publish job and the real domain are unchecked.

## What to watch after launch

- Repeat `npm run lint && npm run build && npm test && npm run test:rls` on every change; the CI workflow does this.
- Run axe on every address after design changes (the staged script is `dist/_axe.js`, audit use only).
- Check the free-tier limits in `docs/RUNBOOK.md` each quarter; keep the daily publish run so the backend stays active.
- Review the audit log and Launchpad submissions weekly.

## Batch 17 re-check (visual identity, superseded by batch 19)

- Contrast test rewritten for the original paper, ink and accent pairings (restored in batch 19) (text, secondary text, buttons, focus rings, dark sections).
- axe: 0 findings on every public address (home, work, case studies, crew, members, certificates, Launchpad, About, contact, 404) and all 8 portal screens.
- No sideways overflow at 10 sizes on 9 page types. First visit 272 kB.
- Share images, icons and the manifest regenerated in paper and ink (batch 19).
- The vision, principles and About text are first drafts and need the studio's approval.
