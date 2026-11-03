# Go live: Version 1

This puts the public site on the internet for free (GitHub Pages) and switches on the crew portal (a free Supabase project). Allow about 45 minutes. You type passwords and keys only into the GitHub, Google and Supabase websites, never into this repo, a chat or a file.

- Your GitHub account: **RealKingHrs**
- The public site will live at: **https://realkinghrs.github.io/alpha-studios/**
- The crew portal will live at: **https://realkinghrs.github.io/alpha-studios/portal/app/**
- The admin email: **dustmail20@gmail.com**

## How people get into the portal

1. A crew member opens the website and types `cryptex` (or clicks the logo seven times quickly). Five wheels appear.
2. They set **their own five-character PIN** on the wheels and press Continue.
3. The portal checks the PIN and emails a **six-digit code** to the address the admin registered for them. Only a masked address (`d•••••••@gmail.com`) is shown.
4. They type the code and the portal opens. No passwords exist anywhere.

The admin (you) adds each person with their email, presses **Issue PIN** and sends them the PIN privately. A PIN is shown once and stored only as a hash. Five wrong PINs from one place, or thirty from anywhere, lock PIN entry for fifteen minutes.

**What each role can do** (enforced by the database, not by hidden buttons):

|                              | Visitor | Crew                                  | Admin                          |
| ---------------------------- | ------- | ------------------------------------- | ------------------------------ |
| Public pages                 | yes     | yes                                   | yes                            |
| Own profile and avatar       | no      | edit                                  | edit all profiles              |
| Projects                     | read    | edit only projects the admin assigned | everything, and assigns people |
| Launchpad ideas              | no      | read                                  | read, log, review, approve     |
| People, emails, PINs, access | no      | no                                    | everything                     |
| Audit log and undo           | no      | no                                    | yes                            |

## Part 1: the public site (GitHub)

1. Sign in to GitHub as RealKingHrs. Click **+** at the top right, **New repository**. Name it exactly `alpha-studios`, choose **Public**, leave every box unticked (no README), click **Create repository**.
2. In the project folder run these. The first command checks everything is ready; the remote is already set to your account.

   ```bash
   npm run go-live:check
   git push -u origin main
   ```

   Git asks you to sign in once. Use your GitHub username and a **personal access token** as the password (GitHub, Settings, Developer settings, Personal access tokens, tick `repo`), or the browser sign-in if your Mac offers it.

3. On GitHub open the repository, **Settings, Pages**, under **Source** choose **GitHub Actions**.
4. Open the **Actions** tab. The workflow **publish** starts by itself. When it is green (about three minutes) open `https://realkinghrs.github.io/alpha-studios/`. The site is live.

The site reads only a snapshot file, so it keeps working even if the portal's database sleeps.

## Part 2: the portal's backend (Supabase)

1. Go to supabase.com, sign up (free), **New project**. Name `alpha-studios`, choose the nearest region, make a strong database password and save it in a password manager. Wait until the project is ready.
2. In the project folder:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   npx supabase functions deploy portal-pin --no-verify-jwt
   ```

   `<ref>` is the short code in the project's address (`https://supabase.com/dashboard/project/<ref>`). `db push` builds the tables and every access rule. The function is what checks PINs.

3. **SQL Editor**: paste the contents of `supabase/seed.sql` and run it once. This puts in the starter content, which you replace later.
4. **Sign-in settings** (Authentication in the dashboard):
   - **Sign In / Providers**: Email on. **Turn off "Allow new users to sign up"**: logins are created only by the PIN function, never by visitors. Set **Email OTP Expiration** to `600` and **Email OTP Length** to `6`.
   - **Emails, Templates, Magic Link**: set the subject to `Your Alpha Studios sign-in code` and paste in the contents of `supabase/templates/otp.html`. This puts the six-digit code in the email.
5. **Email delivery (important).** Supabase's built-in mail allows only a handful of emails per hour, which is not enough for sign-in. Use your Gmail instead, free:
   1. Google Account for dustmail20@gmail.com, **Security**, turn on **2-Step Verification**, then open `myaccount.google.com/apppasswords`, make an app password named "Alpha Studios" and copy the 16 letters.
   2. Supabase, **Project Settings, Authentication, SMTP Settings**: turn on Custom SMTP. Host `smtp.gmail.com`, port `465`, username `dustmail20@gmail.com`, password = the 16-letter app password, sender email `dustmail20@gmail.com`, sender name `Alpha Studios`. Save.
6. **Project Settings, API**: copy the **Project URL**, the **anon (publishable) key** and the **service_role key**.
7. On GitHub, **Settings, Secrets and variables, Actions**:
   - Tab **Variables**: add `VITE_SUPABASE_URL` (the project URL) and `VITE_SUPABASE_ANON_KEY` (the anon key). These two are public by design.
   - Tab **Secrets**: add `SUPABASE_URL` (the project URL) and `SUPABASE_SERVICE_ROLE_KEY` (the service_role key). Never share this one.
8. **Actions, publish, Run workflow**. When it is green the portal is switched on.

## Part 3: make yourself the admin

1. In the project folder run `npm run admin:sql`. It prints **your PIN once** (write it down) and one block of SQL.
2. Supabase, **SQL Editor**, paste that SQL and run it. It makes the Hari Rudran Sunil profile the single admin, registered to dustmail20@gmail.com, with your PIN.
3. Open `https://realkinghrs.github.io/alpha-studios/`, type `cryptex`, set your PIN on the wheels, press Continue. A code arrives at dustmail20@gmail.com; enter it. You are in as admin.

## Run the crew

- **Add someone**: portal, **Crew**, fill in name, role and their email, **Add member and issue PIN**. Send them the PIN privately (not in the same message as the portal link).
- **Give them projects**: portal, **Projects**, open a project, pick their name under "Who is on". They can then edit only that project.
- **Ideas**: visitors pitch on the Launchpad page, which opens an email to you. Log each one under **Launchpad ideas, Log an idea** so the crew can read it.
- **Lost PIN or new email**: **Crew**, **Reissue PIN** or **Change email**. The old PIN stops working at once.
- **Pause someone**: **Crew, Pause access**. Everything is in the **Audit log**, with an undo.

## Make the site findable in search

The site is built with a sitemap, a robots file, page titles, descriptions, share images and structured data about the studio, so search engines can understand it. Two things only you can do:

1. **Google**: open search.google.com/search-console, **Add property**, choose **URL prefix**, enter `https://realkinghrs.github.io/alpha-studios/`. Verify with the **HTML tag** method: copy the `<meta name="google-site-verification" ...>` line, add it to the `<head>` of `index.html`, push, and press Verify. Then **Sitemaps**, add `sitemap.xml`. Do the same at bing.com/webmasters (it can import from Search Console).
2. **Links**: put the address on your GitHub profile and repository description, LinkedIn, and anywhere you are listed. Links from real places are what lift a new site.

Honest expectations: Google usually takes days to weeks to show a new site. "Alpha Studios" is a common name, so the site will not be first for those two words by itself. Searches for "Alpha Studios RealKingHrs" or the address come first. A custom domain (about 10 to 15 USD a year, not free) such as `alphastudios.dev` helps most: buy it, add it under repository Settings, Pages, Custom domain, and ask me to switch the workflow's base address to `/` (a one-line change) before you re-run it.

## Before real visitors

- Replace the sample content: run `npm run content:check` to list the placeholder names, `example.com` links and the `hello@alphastudios.example` address, then change them in the portal (or in `content/seed/content.json`).
- Add real screenshots in `public/screens/` and real store and GitHub links.
- Limits and recovery are in `docs/RUNBOOK.md`.
