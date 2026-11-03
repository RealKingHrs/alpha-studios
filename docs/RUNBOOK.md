# Runbook

Operations for the Alpha Studios site. Keep this current; milestone 1 is not done unless it is accurate.

## Where things run

| Part        | Where                                                     | Address                                    |
| ----------- | --------------------------------------------------------- | ------------------------------------------ |
| Public site | GitHub Pages, deployed by `.github/workflows/publish.yml` | `https://<owner>.github.io/alpha-studios/` |
| Backend     | Supabase project (Postgres, Auth, Storage)                | Project dashboard at supabase.com          |
| Snapshot    | `content.json`, built by the publish job, never committed | Served beside the site                     |

## Secrets

The repo is public. Nothing below is ever committed. The only key allowed in client code is the Supabase publishable (anon) key, safe because row-level security is strict.

| Secret                         | What it is                                                          | Stored in                                     | Used by                                                 |
| ------------------------------ | ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `SUPABASE_URL`                 | Project URL                                                         | GitHub repo secret                            | Publish job                                             |
| `SUPABASE_SERVICE_ROLE_KEY`    | Bypasses row-level security                                         | GitHub repo secret only                       | Publish job only                                        |
| `REPO_READ_TOKEN`              | Optional GitHub token with public-repo read, raises API rate limits | GitHub repo secret                            | Publish job (falls back to the built-in `GITHUB_TOKEN`) |
| GitHub OAuth client secret     | Lets Supabase offer GitHub sign-in                                  | Supabase dashboard, Authentication, Providers | Supabase                                                |
| Supabase database password     | Direct database access                                              | Your password manager                         | You, for the CLI                                        |
| Admin's GitHub account and 2FA | Admin sign-in                                                       | The admin's own account                       | The admin                                               |

Local test keys come from `npx supabase status` at run time and belong to a throwaway local stack. Check before every push: `git grep -nE "service_role|sb_secret|eyJ[A-Za-z0-9_-]{20,}"` should find nothing outside docs text.

## First-time setup

The short, click-by-click version for a first launch is `docs/GO-LIVE.md`. The list below is the reference.

1. Create the public GitHub repo, push, then Settings, Pages, Source: GitHub Actions.
2. Create the Supabase project. Link it: `npx supabase link --project-ref <ref>`, then `npx supabase db push`.
3. Seed placeholder content once: run `supabase/seed.sql` in the Supabase SQL editor.
4. GitHub sign-in: create a GitHub OAuth app (callback `https://<ref>.supabase.co/auth/v1/callback`), then enable GitHub under Authentication, Providers and paste the client ID and secret there.
5. Add the repo secrets listed above.
6. Run the publish workflow from the Actions tab.

## The portal

The portal is a separate app at `/portal/app/` (hash routes, so GitHub Pages needs no fallback). It is the only code that talks to the backend.

| Variable                 | Where                             | Value                                                                |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | GitHub repo variable (not secret) | Project URL                                                          |
| `VITE_SUPABASE_ANON_KEY` | GitHub repo variable (not secret) | The public anon key. Safe only because row-level security is strict. |

Without them the portal builds but shows a "not connected" page.

Local try-out, no hosted account needed: start the local stack (`npx supabase start`), run `npm run dev:users` (creates a throwaway admin and crew login, writes `.env.local` and `.dev-credentials`, both uncommitted; it refuses to run against anything but localhost), then `npm run build` and `npm run preview`, and open `/alpha-studios/portal/app/`.

### Sign-in: PIN, then a code by email

- The admin adds a person with their email and issues a PIN on the **Crew** screen. The PIN is shown once and kept only as a bcrypt hash in `member_access`, a table only the admin can read (and never the hash). Reissuing replaces it; changing the email unlinks the old login.
- The person sets the PIN on five wheels (the website's hidden door, or the portal itself). The `portal-pin` Edge Function checks it with rate limits (5 wrong tries per caller or 30 from anyone in 15 minutes lock PIN entry), emails a six-digit code to the registered address and, once the code is right, links the login to the member and returns a session. The member's email is never sent to the browser, only a masked hint.
- Deploy it with `npx supabase functions deploy portal-pin --no-verify-jwt`. Turn off "Allow new users to sign up" in Supabase Authentication: the function creates logins itself.
- Email delivery uses Supabase's custom SMTP (Gmail app password, see `docs/GO-LIVE.md`) because the built-in mail is capped at a few emails an hour. The email carries the code through the template in `supabase/templates/otp.html` (paste it into Authentication, Emails, Templates, Magic Link). Codes expire after 600 seconds; five wrong codes lock that member out for 15 minutes.
- Lost PIN: the admin reissues it. Lost admin PIN or email: the Supabase project owner runs `npm run admin:sql` again and executes the printed SQL in the SQL editor.
- Roles: the admin assigns people to projects; crew edit only projects assigned to them and can read Launchpad ideas. Ideas arrive by email from the public Launchpad form; the admin logs them under Launchpad ideas.

### Publishing from the portal

Changes in the portal reach the public site when the publish job runs. To start it right after a change:

1. Deploy the function: `npx supabase functions deploy publish-trigger`.
2. Set its secrets in the dashboard (Edge Functions, Secrets): `WEBHOOK_SECRET` (a long random string), `GITHUB_REPO` (`owner/repo`) and `GITHUB_DISPATCH_TOKEN` (a fine-grained GitHub token limited to this repo with Contents: read and write, which repository dispatch needs).
3. In Database, Webhooks, create one webhook for each of `members`, `projects`, `project_members` and `site_settings` on insert, update and delete, calling the function with the header `x-webhook-secret: <the same string>`.

A burst of edits makes a burst of requests. The workflow's concurrency group keeps one run going and one waiting, so it becomes at most two builds. The twice-daily scheduled runs remain as the fallback if a webhook is missed.

## Launchpad and founder credit

- A pitch arrives under **Portal > Submissions**. Approving creates the project with the founder credit locked and an unclaimed founder profile. Open **Crew**, issue that profile an invite, and give the founder the code so they can claim it.
- **Before launch, a lawyer must write the terms** for adopting a project: what ownership transfers, what the studio provides, what the founder keeps, and what happens if the founder moves on. The site only says terms are agreed in writing; it does not define them.
- A locked credit cannot be changed or removed from the app. To correct a mistake on purpose, use the SQL editor (no signed-in user) and note it in the audit trail by hand.

## AI suggestions for the profile line

The portal's Suggest button calls the `suggest-tagline` Edge Function, which needs a backend secret: `npx supabase secrets set ANTHROPIC_API_KEY=...` and `npx supabase functions deploy suggest-tagline`. The key never goes in the site or the repository. Each call costs a small amount, so set a spending limit with the provider. Without the key the button says suggestions are not set up and members write their own.

## Creating the single admin

Exactly one admin exists, created once, directly in the backend. Run `npm run admin:sql` on your own machine: it prints a PIN once and one block of SQL for the SQL editor, which makes the chosen profile the admin with your email and a hashed PIN. A unique index allows only one admin row.

## Recovery

- **Admin lost access** (account lost, 2FA lost): the Supabase project owner signs in to the Supabase dashboard and uses the SQL editor, which bypasses row-level security. Point the admin row at the new login:

```sql
update public.members set user_id = '<new user id>', access_status = 'active' where role = 'admin';
```

- **Crew member lost access**: the admin reissues their PIN (and checks their email) on the Crew screen.
- **Bad crew edit**: the audit log holds the previous value of every change (`select * from public.audit_log order by id desc`). One-click revert arrives in milestone 5.
- **Backend owner account lost**: Supabase account recovery is the only path. Keep the owner login in a password manager with a recovery code stored offline.

## Resuming a paused backend

Free Supabase projects pause after about a week of too little database activity. The publish job runs a request twice daily, which usually prevents it. If it pauses anyway:

1. Open the project in the Supabase dashboard and choose Restore project. Data is kept.
2. Wait until it reports healthy, then run the publish workflow.
3. The public site stays up throughout because it reads only `content.json`.

Recheck the free-tier limits before launch (SPEC section 8).

## Publish job

- Runs on manual trigger, on `repository_dispatch` type `publish`, on push to `main`, and at 05:17 and 13:43 UTC daily. The second run heals a missed trigger.
- With no `SUPABASE_URL` secret it publishes the placeholder seed, so the site works before the backend is connected.
- If GitHub is unreachable it keeps the cached repo details. If the data fails the snapshot contract the job fails and nothing is deployed.
- Dry run on your machine: `npm run publish:dry`.

## Free-tier limits (rechecked 3 November 2026)

Read from the vendors' own pages on that date; recheck on the day of launch.

| Service       | Limit                                                                                                                                                                                                                                                                                                                                             | Source                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Supabase Free | A free project with too little database activity over a week is paused. A paused project keeps all of its data and settings. You get an email about a week before and another when it happens. The page does not say how long a paused project stays restorable. A few requests a day usually keeps a project awake, but that is not a guarantee. | supabase.com/kb/faqs/platform/free-project-pausing |
| GitHub Pages  | Sites may be no larger than 1 GB. Soft bandwidth limit of 100 GB a month. Soft limit of 10 builds an hour, which does not apply to custom GitHub Actions workflows (this site uses one). Deployments time out after 10 minutes.                                                                                                                   | docs.github.com, GitHub Pages limits               |

The built site is about 2 MB, far inside the size limit. The publish job makes a request to the backend at least twice a day.

## Launch checklist

Tick each line with the date and who checked it. Nothing here is done until a person has seen it done.

**Blocked on you**

- [ ] Trademark search for "Alpha Studios" and for lowercase-alpha marks in software and app classes (spec section 3). Record the result and date here: ________. If it conflicts, switch to the fallback mark before launch.
- [ ] Real content in `content/seed/content.json` or through the portal: studio statement, contact email, five bios, two projects with stories, real screenshots in `public/screens/`, store and GitHub links, GitHub repositories for stars and commits. The fictional sample people, projects and example links are gone: `npm run content:check` reports nothing.
- [ ] Each crew member has agreed in the portal that name, role, bio and links are public (their consent date shows on their profile).
- [ ] Domain decision recorded (free GitHub Pages address or a custom domain).

**Accounts and secrets** (see "Secrets" above)

- [ ] GitHub repo is public, Pages source is GitHub Actions.
- [ ] Supabase project created, `npx supabase db push` applied, seed or real content loaded.
- [ ] GitHub sign-in enabled on the Supabase project; the OAuth app callback matches.
- [ ] Repo secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `REPO_READ_TOKEN`. Repo variables set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] `git log -p | git grep` style check: no service key, token or password is in the history. Run a secret scanner over the full history, not only the working tree.
- [ ] Admin created, GitHub two-factor on, admin can sign in to the portal.
- [ ] Publish trigger deployed and the four database webhooks created, or the team accepts twice-daily publishing only.

**Health**

- [ ] Publish workflow ran green from the Actions tab and the live site shows the new content.
- [ ] A change in the portal appears on the live site after the next publish.
- [ ] Direct links to a case study, a profile and an unknown address work on the live host (the unknown one shows the playful 404).
- [ ] Backup export taken: from the Supabase dashboard, a database backup or `pg_dump`, plus a copy of the published `content.json`. Stored outside the repo. Date: ________.
- [ ] Free-tier limits rechecked today.

**Quality**

- [ ] Performance measured on a real recent laptop and a real mid-range phone; numbers written in `docs/PERFORMANCE.md`; gaps accepted by the owner.
- [ ] Keyboard-only walkthrough and a real screen reader pass (VoiceOver on Mac and iPhone) by a person.
- [ ] Opened on a real phone: the home page, the stacking project panels, a case study, the crew characters, and the portal sign-in.
- [ ] Share previews checked by pasting a few addresses into a chat or social post.
