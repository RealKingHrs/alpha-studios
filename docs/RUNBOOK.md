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

### Invites

- The admin issues a code on the Crew screen. The code is shown once, only a bcrypt hash is stored, and it works once and expires after seven days. Reissuing expires the old code and unlinks the old login.
- A person creates a login (GitHub or email and password), enters the code and agrees that their name, role, bio and links are public. Five wrong codes in 15 minutes lock that login out of trying for a while.
- Honest limit: with GitHub or email sign-up, the login row exists before the code is checked. A login with no linked profile can do nothing (every rule needs an active member), and `app.sweep_orphan_logins()` removes such logins after a day. Hosted projects schedule it with pg_cron when the extension is on; otherwise run `select app.sweep_orphan_logins();` now and then from the SQL editor.

### Publishing from the portal

Changes in the portal reach the public site when the publish job runs. To start it right after a change:

1. Deploy the function: `npx supabase functions deploy publish-trigger`.
2. Set its secrets in the dashboard (Edge Functions, Secrets): `WEBHOOK_SECRET` (a long random string), `GITHUB_REPO` (`owner/repo`) and `GITHUB_DISPATCH_TOKEN` (a fine-grained GitHub token limited to this repo with Contents: read and write, which repository dispatch needs).
3. In Database, Webhooks, create one webhook for each of `members`, `projects`, `project_members` and `site_settings` on insert, update and delete, calling the function with the header `x-webhook-secret: <the same string>`.

A burst of edits makes a burst of requests. The workflow's concurrency group keeps one run going and one waiting, so it becomes at most two builds. The twice-daily scheduled runs remain as the fallback if a webhook is missed.

## Creating the single admin

Exactly one admin exists, created once, directly in the backend.

1. Turn on two-factor authentication on the admin's GitHub account first.
2. The admin signs in once with GitHub. That creates their row in Authentication, Users. Copy their user id.
3. In the SQL editor:

```sql
insert into public.members (user_id, slug, name, role_title, role, access_status)
values ('<user id>', '<slug>', '<Name>', '<Title>', 'admin', 'active');
```

A unique index allows only one admin row; a second insert fails.

## Recovery

- **Admin lost access** (account lost, 2FA lost): the Supabase project owner signs in to the Supabase dashboard and uses the SQL editor, which bypasses row-level security. Point the admin row at the new login:

```sql
update public.members set user_id = '<new user id>', access_status = 'active' where role = 'admin';
```

- **Crew member lost access**: the admin reissues an invite code in the portal (milestone 5).
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
- [ ] Real content in `content/seed/content.json` or through the portal: studio statement, contact email, five bios, two projects with stories, real screenshots in `public/screens/`, store and GitHub links, GitHub repositories for stars and commits. Every "Placeholder" string is gone: `git grep -n -i placeholder -- content public src` finds nothing.
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
- [ ] Direct links to a room, a profile and an unknown address work on the live host (the unknown one shows the in-vault 404).
- [ ] Backup export taken: from the Supabase dashboard, a database backup or `pg_dump`, plus a copy of the published `content.json`. Stored outside the repo. Date: ________.
- [ ] Free-tier limits rechecked today.

**Quality**

- [ ] Performance measured on a real recent laptop and a real mid-range phone; numbers written in `docs/PERFORMANCE.md`; gaps accepted by the owner.
- [ ] Keyboard-only walkthrough and a real screen reader pass (VoiceOver on Mac and iPhone) by a person.
- [ ] Opened on a real phone: intro, travel by swipe, a room, the portal sign-in.
- [ ] Share previews checked by pasting a few addresses into a chat or social post.
