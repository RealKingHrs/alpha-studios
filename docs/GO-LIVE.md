# Go live: Version 1

This puts the public site on the internet for free (GitHub Pages) and switches on the crew portal (a free Supabase project). Allow about 30 minutes. You never paste a password or key into this repo or into a chat; you paste them only into the GitHub and Supabase websites.

Replace `<user>` with your GitHub username everywhere below. The site will live at `https://<user>.github.io/alpha-studios/`.

## Part 1: the public site (GitHub)

1. Sign in to GitHub. Click the **+** at the top, **New repository**. Name it exactly `alpha-studios`, choose **Public**, leave every box unticked (no README), click **Create repository**.
2. In the project folder, run:

   ```bash
   npm run go-live:check
   git remote add origin https://github.com/<user>/alpha-studios.git
   git push -u origin main
   ```

   Git asks you to sign in once (use your GitHub username and a personal access token, or the browser sign-in if your Mac offers it).

3. On GitHub: repository **Settings**, **Pages**, under **Source** choose **GitHub Actions**.
4. Open the **Actions** tab. The workflow named **publish** starts by itself. When it shows a green tick (about three minutes), open `https://<user>.github.io/alpha-studios/`. The site is live.

The site reads only a snapshot file, so it keeps working even if the portal's database sleeps.

## Part 2: the crew portal (Supabase)

1. Go to supabase.com, sign up (free), **New project**. Name `alpha-studios`, choose the nearest region, make a strong database password and save it in a password manager. Wait until the project says it is ready.
2. In the project folder:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

   `<ref>` is the short code in the project's address (`https://supabase.com/dashboard/project/<ref>`). `db push` builds every table and every access rule.

3. In the Supabase dashboard, **SQL Editor**, paste the contents of `supabase/seed.sql` and run it once. This puts in the starter content (the sample people and projects) which you will replace in the portal.
4. **Authentication, Providers**: make sure **Email** is on. Under **Authentication, URL Configuration** set **Site URL** to `https://<user>.github.io/alpha-studios/` and add the same address with `portal/app/` on the end as a redirect URL. For a small private crew you can turn **Confirm email** off; invites still protect the portal.
5. **Project Settings, API**: copy the **Project URL**, the **anon (publishable) key** and the **service_role key**.
6. On GitHub, **Settings, Secrets and variables, Actions**:
   - Tab **Variables**, add `VITE_SUPABASE_URL` (the project URL) and `VITE_SUPABASE_ANON_KEY` (the anon key). These two are public by design.
   - Tab **Secrets**, add `SUPABASE_URL` (the project URL) and `SUPABASE_SERVICE_ROLE_KEY` (the service_role key). Never share this one with anyone.
7. **Actions, publish, Run workflow**. When it is green the portal is switched on.

## Part 3: the first admin

1. Open the portal: `https://<user>.github.io/alpha-studios/portal/app/`. Choose **Create a login**, enter your email and a password.
2. In Supabase, **Authentication, Users**: copy your user id.
3. In **SQL Editor** run (put your own values in):

   ```sql
   insert into public.members (user_id, slug, name, role_title, role, access_status)
   values ('<user id>', 'hari-rudran-sunil', 'Hari Rudran Sunil', 'Founder', 'admin', 'active');
   ```

   Only one admin can exist; that is on purpose.

4. Reload the portal and sign in. You now see the admin screens.

## How crew get in (invite only)

- Admin: portal **Crew** screen, pick a person, **Issue invite**. A one-time code appears once; copy it and send it to them privately. It works once and expires after seven days.
- Crew member: opens the portal link, **Create a login** with their own email and password, then enters the invite code and agrees that their name, role, bio and links are public. After that they can edit their own profile and projects.
- Anyone without an invite can create a login but sees only the code screen. The database rules (row-level security) block every read and write until a code is accepted, so hiding links is not the only protection.

## The hidden door on the website

The public pages have no portal link. Type `cryptex` on any page, or click the logo seven times quickly, and spin the five wheels to `ALPHA`. That only reveals the portal's address; signing in is still required.

## Before real visitors

- Replace the sample content: run `npm run content:check` to list the placeholder names, `example.com` links and the `hello@alphastudios.example` address, then change them in the portal (or in `content/seed/content.json` and re-seed).
- Add real screenshots in `public/screens/` and real store and GitHub links.
- Everything about your free limits and recovery is in `docs/RUNBOOK.md`.
